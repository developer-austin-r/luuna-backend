import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateUserReviewDto } from './dto/create-user-review.dto';
import { UpdateUserReviewStatusDto } from './dto/update-user-review-status.dto';
import { UserReviewService } from './user-review.service';

@ApiTags('user-reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-reviews')
export class UserReviewController {
  constructor(private readonly userReviewService: UserReviewService) {}

  @Get()
  @ApiOkResponse({ description: 'Returns all active user reviews.' })
  findAll() {
    return this.userReviewService.findAll();
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  @ApiOkResponse({ description: 'User review status updated successfully.' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserReviewStatusDto,
  ) {
    return this.userReviewService.updateStatus(id, dto);
  }

  @Post()
  @ApiCreatedResponse({ description: 'User review created successfully.' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createUserReviewDto: CreateUserReviewDto,
  ) {
    return this.userReviewService.create(user.sub, createUserReviewDto);
  }
}
