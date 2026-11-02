import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import type { Request } from 'express';
import { ActivityLogService } from '../activity-log/activity-log.service';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ========================================
  // CREATE
  // ========================================

  @Post()
  @ApiCreatedResponse({
    description: 'User created successfully.',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  // ========================================
  // GET USERS WITH PAGINATION + FILTER
  // ========================================

  @Get()
  @ApiOkResponse({
    description: 'Returns paginated users.',
  })
  findAll(@Query() query: GetUsersQueryDto) {
    return this.userService.findAll(query);
  }

  // ========================================
  // GET CURRENT USER PROFILE
  // ========================================

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Returns the current user profile.',
  })
  async getProfile(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    const profile = await this.userService.getProfile(user.sub);

    await this.activityLogService.log({
      userId: user.sub,
      sessionId: req['sessionId'],
      moduleName: 'profile',
      actionName: 'profile_viewed',
      entityId: user.sub,
      description: `Viewed own profile`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return profile;
  }

  // ========================================
  // UPDATE CURRENT USER PROFILE
  // ========================================

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Updates the current user profile.',
  })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req: Request,
  ) {
    const result = await this.userService.updateProfile(
      user.sub,
      updateProfileDto,
    );

    await this.activityLogService.log({
      userId: user.sub,
      sessionId: req['sessionId'],
      moduleName: 'profile',
      actionName: 'profile_updated',
      entityId: user.sub,
      description: `Updated own profile`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        updated_fields: Object.keys(updateProfileDto),
      },
    });

    return result;
  }

  // ========================================
  // CHANGE PASSWORD (AUTHENTICATED USER)
  // ========================================

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Change user password',
    description:
      'Allows an authenticated user to change their password by providing their current password and setting a new one.',
  })
  @ApiOkResponse({
    description: 'Password changed successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Current password is incorrect, new password matches current password, or validation failed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing authentication credentials.',
  })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const result = await this.userService.changePassword(
      user.sub,
      changePasswordDto,
    );

    await this.activityLogService.log({
      userId: user.sub,
      sessionId: req['sessionId'],
      moduleName: 'password',
      actionName: 'password_changed',
      entityId: user.sub,
      description: 'Changed password from user profile',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return result;
  }

  // ========================================
  // GET USER BY ID
  // ========================================

  @Get(':id')
  @ApiOkResponse({
    description: 'Returns a user by ID.',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = await this.userService.findOne(id);

    await this.activityLogService.log({
      userId: req.user?.sub,
      sessionId: req['sessionId'],
      moduleName: 'profile',
      actionName: 'profile_viewed',
      entityId: id,
      description: `Viewed profile of user "${user.name || user.email}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return user;
  }

  // ========================================
  // UPDATE
  // ========================================

  @Patch(':id')
  @ApiOkResponse({
    description: 'User updated successfully.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const user = await this.userService.update(id, updateUserDto);

    if (updateUserDto.password) {
      await this.activityLogService.log({
        userId: req.user?.sub,
        sessionId: req['sessionId'],
        moduleName: 'password',
        actionName: 'password_changed',
        entityId: id,
        description: `Changed password for user "${user.name || user.email}"`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } else {
      await this.activityLogService.log({
        userId: req.user?.sub,
        sessionId: req['sessionId'],
        moduleName: 'profile',
        actionName: 'profile_updated',
        entityId: id,
        description: `Updated profile details for user "${user.name || user.email}"`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          updated_fields: Object.keys(updateUserDto).filter(
            (k) => k !== 'password',
          ),
        },
      });
    }

    return user;
  }

  // ========================================
  // DELETE
  // ========================================

  @Delete(':id')
  @ApiOkResponse({
    description: 'User deleted successfully.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.remove(id);
  }

  @Post(':id/resend-verification')
  async resendVerificationEmail(@Param('id') id: string) {
    const result = await this.userService.resendVerificationEmail(id);

    return {
      data: result,
    };
  }
}
