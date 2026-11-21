import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [OptionalJwtAuthGuard, CartService],
})
export class CartModule {}
