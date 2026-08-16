import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [ActivityLogModule],
  controllers: [CheckoutController],
})
export class CheckoutModule {}
