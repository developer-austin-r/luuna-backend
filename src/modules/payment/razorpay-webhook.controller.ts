import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentService } from './payment.service';
import { RazorpayGatewayAdapter } from './razorpay-gateway.adapter';
import { HttpsOnlyGuard } from './https-only.guard';

@Controller('webhooks/razorpay')
@UseGuards(HttpsOnlyGuard)
export class RazorpayWebhookController {
  constructor(
    private readonly payments: PaymentService,
    private readonly gateway: RazorpayGatewayAdapter,
  ) {}

  @Post()
  @HttpCode(202)
  async receive(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature?: string,
    @Headers('x-razorpay-event-id') eventId?: string,
  ) {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody || !signature || !eventId)
      throw new BadRequestException(
        'Webhook signature, event ID, and raw body are required',
      );
    if (eventId.length > 255 || rawBody.length > 1_000_000) {
      throw new BadRequestException('Webhook request exceeds supported limits');
    }
    if (!this.gateway.verifyWebhookSignature(rawBody, signature))
      throw new UnauthorizedException('Invalid webhook signature');
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }
    if (typeof payload.event !== 'string')
      throw new BadRequestException('Missing webhook event type');
    await this.payments.persistWebhook(eventId, payload.event, payload);
    return { accepted: true };
  }
}
