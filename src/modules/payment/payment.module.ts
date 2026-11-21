import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PAYMENT_GATEWAY } from './payment-gateway.interface';
import { RazorpayGatewayAdapter } from './razorpay-gateway.adapter';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import {
  PaymentAdminController,
  RefundController,
} from './payment-admin.controller';
import { EmailModule } from '../email/email.module';
import { InvoicePdfService } from '../billing/invoice-pdf.service';
import { HttpsOnlyGuard } from './https-only.guard';

@Module({
  imports: [PrismaModule, AuthModule, EmailModule],
  controllers: [
    PaymentController,
    RazorpayWebhookController,
    PaymentAdminController,
    RefundController,
  ],
  providers: [
    PaymentService,
    InvoicePdfService,
    HttpsOnlyGuard,
    RazorpayGatewayAdapter,
    { provide: PAYMENT_GATEWAY, useExisting: RazorpayGatewayAdapter },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
