import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ActivityLogService } from '../activity-log/activity-log.service';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Post('start')
  async startCheckout(
    @Body() body: { cartTotal: number },
    @Req() req: Request,
  ) {
    await this.activityLogService.log({
      userId: (req.user as { sub?: string } | undefined)?.sub,
      sessionId: req['sessionId'],
      moduleName: 'checkout',
      actionName: 'checkout_started',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      description: 'User started checkout process',
      metadata: { cart_total: body.cartTotal },
    });
    return { success: true, message: 'Checkout session started' };
  }
}
