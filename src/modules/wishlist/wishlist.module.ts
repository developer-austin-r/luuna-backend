import { Module } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [WishlistController],
  providers: [WishlistService, OptionalJwtAuthGuard],
  exports: [WishlistService],
})
export class WishlistModule {}
