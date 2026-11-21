import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PAYMENT_GATEWAY, PaymentGateway } from './payment-gateway.interface';

@Injectable()
export class RazorpayGatewayAdapter implements PaymentGateway {
  static readonly provider = PAYMENT_GATEWAY;
  private readonly client?: Razorpay;
  private readonly keySecret?: string;
  private readonly webhookSecret?: string;

  constructor(private readonly config: ConfigService) {
    const keyId = config.get<string>('payments.razorpayKeyId');
    this.keySecret = config.get<string>('payments.razorpayKeySecret');
    this.webhookSecret = config.get<string>('payments.razorpayWebhookSecret');
    if (keyId && this.keySecret) {
      this.client = new Razorpay({ key_id: keyId, key_secret: this.keySecret });
    }
  }

  get keyId(): string {
    return this.config.get<string>('payments.razorpayKeyId') ?? '';
  }

  private requireClient(): Razorpay {
    if (!this.client)
      throw new ServiceUnavailableException(
        'Online payments are not configured',
      );
    return this.client;
  }

  async createOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
  }) {
    const order = await this.requireClient().orders.create(input);
    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    };
  }

  async fetchPayment(paymentId: string) {
    const payment = await this.requireClient().payments.fetch(paymentId);
    return {
      id: payment.id,
      order_id: payment.order_id ?? '',
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
    };
  }

  async fetchPaymentsForOrder(orderId: string) {
    const response = await this.requireClient().orders.fetchPayments(orderId);
    return response.items.map((payment) => ({
      id: payment.id,
      order_id: payment.order_id ?? orderId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
    }));
  }

  async createRefund(paymentId: string, amount: number, receipt: string) {
    const refund = await this.requireClient().payments.refund(paymentId, {
      amount,
      receipt,
    });
    return {
      id: refund.id,
      status: refund.status,
      amount: Number(refund.amount),
    };
  }

  async fetchRefund(paymentId: string, refundId: string) {
    const refund = await this.requireClient().payments.fetchRefund(
      paymentId,
      refundId,
    );
    return {
      id: refund.id,
      status: refund.status,
      amount: Number(refund.amount),
    };
  }

  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ) {
    if (!this.keySecret) return false;
    const expected = createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest();
    let supplied: Buffer;
    try {
      supplied = Buffer.from(signature, 'hex');
    } catch {
      return false;
    }
    return (
      supplied.length === expected.length && timingSafeEqual(supplied, expected)
    );
  }

  verifyWebhookSignature(body: Buffer, signature: string) {
    if (!this.webhookSecret) return false;
    return Razorpay.validateWebhookSignature(
      body.toString('utf8'),
      signature,
      this.webhookSecret,
    );
  }
}
