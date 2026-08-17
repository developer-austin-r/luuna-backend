import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';
import type { Request } from 'express';
import { ActivityLogService } from '../activity-log/activity-log.service';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post()
  @ApiCreatedResponse({ description: 'User created successfully.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOkResponse({ description: 'Returns all users.' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Returns a user by ID.' })
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

  @Patch(':id')
  @ApiOkResponse({ description: 'User updated successfully.' })
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

  @Delete(':id')
  @ApiOkResponse({ description: 'User deleted successfully.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.remove(id);
  }
}
