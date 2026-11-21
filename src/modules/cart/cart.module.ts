import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { CartAuthGuard } from './cart-auth.guard';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [CartAuthGuard, CartService],
})
export class CartModule {}
