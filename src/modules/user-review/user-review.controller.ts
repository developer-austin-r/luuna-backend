import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Header,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateUserReviewDto } from './dto/create-user-review.dto';
import { UpdateUserReviewStatusDto } from './dto/update-user-review-status.dto';
import {
  MAX_REVIEW_IMAGES,
  MAX_REVIEW_IMAGE_BYTES,
  type ReviewImageUpload,
} from './review-images.service';
import { UserReviewService } from './user-review.service';

@ApiTags('user-reviews')
@Controller('user-reviews')
export class UserReviewController {
  constructor(private readonly reviews: UserReviewService) {}

  @Get('product/:productId')
  @Header('Cache-Control', 'no-store')
  findApproved(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    if (page < 1 || page > 10_000) {
      throw new BadRequestException('Invalid review page');
    }
    return this.reviews.findApproved(productId, page);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  findAll() {
    return this.reviews.findAll();
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserReviewStatusDto,
  ) {
    return this.reviews.updateStatus(id, dto);
  }

  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', MAX_REVIEW_IMAGES, {
      limits: {
        fileSize: MAX_REVIEW_IMAGE_BYTES,
        files: MAX_REVIEW_IMAGES,
        fields: 4,
      },
    }),
  )
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateUserReviewDto,
    @UploadedFiles() files?: ReviewImageUpload[],
  ) {
    return this.reviews.create(user.sub, dto, files);
  }
}
