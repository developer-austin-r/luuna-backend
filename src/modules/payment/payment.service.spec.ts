import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentRecordStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGateway } from './payment-gateway.interface';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  const payment = {
    id: 'payment-1',
    userId: 'user-1',
    orderId: 'order-1',
    gatewayOrderId: 'rzp-order-1',
    amount: 125.5,
    currency: 'INR',
    status: PaymentRecordStatus.PENDING,
    paymentMethod: null,
  };
  let prisma: Record<string, jest.Mock>;
  let gateway: jest.Mocked<PaymentGateway>;
  let service: PaymentService;

  beforeEach(() => {
    const tx = {
      payment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(payment),
        update: jest.fn(),
      },
      paymentTransaction: { create: jest.fn() },
      order: {
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ orderStatus: 'PENDING' }),
        update: jest.fn(),
      },
      paymentAuditLog: { create: jest.fn() },
      paymentOutboxEvent: { create: jest.fn() },
    };
    prisma = {
      payment: { findUnique: jest.fn().mockResolvedValue(payment) },
      $transaction: jest.fn((fn: (arg: typeof tx) => unknown) => fn(tx)),
    } as unknown as Record<string, jest.Mock>;
    gateway = {
      createOrder: jest.fn(),
      fetchPayment: jest.fn(),
      fetchPaymentsForOrder: jest.fn(),
      verifyPaymentSignature: jest.fn().mockReturnValue(true),
      verifyWebhookSignature: jest.fn(),
    };
    const config = {
      get: jest.fn((key: string) =>
        key === 'payments.enabled' ? true : undefined,
      ),
    };
    service = new PaymentService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
      { sendOrderConfirmationEmail: jest.fn() } as never,
      { generatePdf: jest.fn() } as never,
      { uploadFile: jest.fn(), generateDownloadUrl: jest.fn() } as never,
      gateway,
    );
  });

  it('does not confirm a callback whose signature is invalid', async () => {
    gateway.verifyPaymentSignature.mockReturnValue(false);
    await expect(
      service.verify('user-1', {
        razorpay_order_id: 'rzp-order-1',
        razorpay_payment_id: 'rzp-pay-1',
        razorpay_signature: 'bad',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(gateway.fetchPayment.mock.calls).toHaveLength(0);
  });

  it('rejects a captured gateway payment with a mismatched amount', async () => {
    gateway.fetchPayment.mockResolvedValue({
      id: 'rzp-pay-1',
      order_id: 'rzp-order-1',
      amount: 1,
      currency: 'INR',
      status: 'captured',
    });
    await expect(
      service.verify('user-1', {
        razorpay_order_id: 'rzp-order-1',
        razorpay_payment_id: 'rzp-pay-1',
        razorpay_signature: 'valid',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('confirms only a captured gateway payment and records downstream work transactionally', async () => {
    gateway.fetchPayment.mockResolvedValue({
      id: 'rzp-pay-1',
      order_id: 'rzp-order-1',
      amount: 12550,
      currency: 'INR',
      status: 'captured',
      method: 'upi',
    });
    await expect(
      service.verify('user-1', {
        razorpay_order_id: 'rzp-order-1',
        razorpay_payment_id: 'rzp-pay-1',
        razorpay_signature: 'valid',
      }),
    ).resolves.toEqual({
      status: PaymentRecordStatus.CAPTURED,
      paymentId: 'payment-1',
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
