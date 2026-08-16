import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [ActivityLogModule],
  controllers: [CartController],
})
export class CartModule {}
