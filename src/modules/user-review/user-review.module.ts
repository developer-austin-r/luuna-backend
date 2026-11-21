import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UserReviewController } from './user-review.controller';
import { UserReviewService } from './user-review.service';
import { ReviewImagesService } from './review-images.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserReviewController],
  providers: [UserReviewService, ReviewImagesService],
})
export class UserReviewModule {}
