import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentRecordStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PaymentRefundStatus, PaymentWebhookStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PAYMENT_GATEWAY } from './payment-gateway.interface';
import type { PaymentGateway } from './payment-gateway.interface';
import { EmailService } from '../email/email.service';
import { InvoicePdfService } from '../billing/invoice-pdf.service';
import { StorageService } from '../../common/storage/storage.service';
import { VerifyPaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentService.name);
  private worker?: NodeJS.Timeout;
  private nextReconciliationAt = 0;
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly invoicePdf: InvoicePdfService,
    private readonly storage: StorageService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  onModuleInit() {
    this.worker = setInterval(() => {
      void this.processPendingWebhooks();
      void this.processPendingOutbox();
      void this.expirePendingPayments().catch(() =>
        this.logger.error('Payment expiration check failed'),
      );
      if (
        this.config.get<boolean>('payments.reconciliationEnabled') &&
        this.config.get<boolean>('payments.enabled') &&
        Date.now() >= this.nextReconciliationAt
      ) {
        const interval =
          this.config.get<number>('payments.reconciliationIntervalMinutes') ??
          60;
        this.nextReconciliationAt = Date.now() + interval * 60_000;
        void this.reconcile().catch(() =>
          this.logger.error('Scheduled payment reconciliation failed'),
        );
      }
    }, 5000);
    this.worker.unref();
  }

  onModuleDestroy() {
    if (this.worker) clearInterval(this.worker);
  }

  async persistWebhook(
    eventId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const root = payload.payload as Record<string, unknown> | undefined;
    const paymentEntity = (
      root?.payment as { entity?: Record<string, unknown> } | undefined
    )?.entity;
    const orderEntity = (
      root?.order as { entity?: Record<string, unknown> } | undefined
    )?.entity;
    const refundEntity = (
      root?.refund as { entity?: Record<string, unknown> } | undefined
    )?.entity;
    // Persist only identifiers/status/amount/currency; provider payloads may contain payment
    // instrument metadata that is unnecessary for our ledger and should not be retained.
    const safePayload = {
      event: eventType,
      paymentId:
        typeof paymentEntity?.id === 'string' ? paymentEntity.id : undefined,
      orderId:
        typeof paymentEntity?.order_id === 'string'
          ? paymentEntity.order_id
          : typeof orderEntity?.id === 'string'
            ? orderEntity.id
            : undefined,
      paymentStatus:
        typeof paymentEntity?.status === 'string'
          ? paymentEntity.status
          : undefined,
      amount:
        typeof paymentEntity?.amount === 'number'
          ? paymentEntity.amount
          : undefined,
      currency:
        typeof paymentEntity?.currency === 'string'
          ? paymentEntity.currency
          : undefined,
      refundId:
        typeof refundEntity?.id === 'string' ? refundEntity.id : undefined,
      refundPaymentId:
        typeof refundEntity?.payment_id === 'string'
          ? refundEntity.payment_id
          : undefined,
      refundStatus:
        typeof refundEntity?.status === 'string'
          ? refundEntity.status
          : undefined,
      refundAmount:
        typeof refundEntity?.amount === 'number'
          ? refundEntity.amount
          : undefined,
    };
    await this.prisma.paymentWebhook.createMany({
      data: [
        {
          gatewayEventId: eventId,
          eventType,
          payload: safePayload,
          signatureVerified: true,
        },
      ],
      skipDuplicates: true,
    });
  }

  private async processPendingWebhooks() {
    try {
      const events = await this.prisma.paymentWebhook.findMany({
        where: {
          processingStatus: {
            in: [PaymentWebhookStatus.PENDING, PaymentWebhookStatus.FAILED],
          },
          processingAttempts: { lt: 8 },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
        },
        orderBy: { receivedAt: 'asc' },
        take: 5,
      });
      for (const event of events) {
        const claimed = await this.prisma.paymentWebhook.updateMany({
          where: {
            id: event.id,
            processingStatus: {
              in: [PaymentWebhookStatus.PENDING, PaymentWebhookStatus.FAILED],
            },
          },
          data: {
            processingStatus: PaymentWebhookStatus.PROCESSING,
            processingAttempts: { increment: 1 },
            errorMessage: null,
          },
        });
        if (claimed.count !== 1) continue;
        try {
          await this.processWebhookEvent(
            event.payload as Record<string, unknown>,
          );
          await this.prisma.paymentWebhook.update({
            where: { id: event.id },
            data: {
              processingStatus: PaymentWebhookStatus.PROCESSED,
              processedAt: new Date(),
              nextAttemptAt: null,
            },
          });
        } catch {
          this.logger.error(`Webhook ${event.id} processing failed`);
          await this.prisma.paymentWebhook.update({
            where: { id: event.id },
            data: {
              processingStatus: PaymentWebhookStatus.FAILED,
              errorMessage:
                'Webhook processing failed; inspect server logs using event ID',
              nextAttemptAt: new Date(
                Date.now() +
                  Math.min(300_000, 1_000 * 2 ** event.processingAttempts),
              ),
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Webhook worker failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async processPendingOutbox() {
    try {
      const events = await this.prisma.paymentOutboxEvent.findMany({
        where: {
          processingStatus: { in: ['PENDING', 'FAILED'] },
          retryCount: { lt: 8 },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
      });
      for (const event of events) {
        const claimed = await this.prisma.paymentOutboxEvent.updateMany({
          where: {
            id: event.id,
            processingStatus: { in: ['PENDING', 'FAILED'] },
          },
          data: { processingStatus: 'PROCESSING' },
        });
        if (claimed.count !== 1) continue;
        try {
          if (event.eventType === 'PAYMENT_CAPTURED') {
            await this.fulfillCapturedPayment(
              event.payload as { paymentId?: string },
            );
          } else if (event.eventType === 'PAYMENT_FAILED') {
            await this.notifyPaymentFailure(
              event.payload as { paymentId?: string },
            );
          } else if (event.eventType.startsWith('REFUND_')) {
            await this.notifyRefund(
              event.payload as { refundId?: string },
              event.eventType,
            );
          }
          await this.prisma.paymentOutboxEvent.update({
            where: { id: event.id },
            data: {
              processingStatus: 'PROCESSED',
              processedAt: new Date(),
              nextAttemptAt: null,
            },
          });
        } catch {
          const retryCount = event.retryCount + 1;
          this.logger.error(
            `Payment outbox ${event.id} failed (attempt ${retryCount})`,
          );
          await this.prisma.paymentOutboxEvent.update({
            where: { id: event.id },
            data: {
              processingStatus: retryCount >= 8 ? 'FAILED' : 'PENDING',
              retryCount,
              nextAttemptAt:
                retryCount >= 8
                  ? null
                  : new Date(
                      Date.now() +
                        Math.min(300_000, 1_000 * 2 ** event.retryCount),
                    ),
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Payment outbox worker failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async notifyPaymentFailure(input: { paymentId?: string }) {
    if (!this.config.get<boolean>('payments.emailNotificationsEnabled')) return;
    if (!input.paymentId)
      throw new BadRequestException('Payment event has no ID');
    const payment = await this.prisma.payment.findUnique({
      where: { id: input.paymentId },
      include: { user: true, order: true },
    });
    if (!payment || payment.status !== PaymentRecordStatus.FAILED) return;
    if (!payment.user.email) return;
    await this.email.sendPaymentFailureEmail(payment.user.email, {
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      paymentReference: payment.paymentReference,
    });
  }

  private async notifyRefund(input: { refundId?: string }, eventType: string) {
    if (!this.config.get<boolean>('payments.emailNotificationsEnabled')) return;
    if (!input.refundId)
      throw new BadRequestException('Refund event has no ID');
    const refund = await this.prisma.refund.findUnique({
      where: { id: input.refundId },
      include: { payment: { include: { user: true, order: true } } },
    });
    if (!refund?.payment.user.email) return;
    const status = eventType.endsWith('PROCESSED')
      ? 'processed'
      : eventType.endsWith('FAILED')
        ? 'failed'
        : 'initiated';
    await this.email.sendRefundUpdateEmail(refund.payment.user.email, {
      orderId: refund.payment.orderId,
      orderNumber: refund.payment.order.orderNumber,
      paymentReference: refund.payment.paymentReference,
      amount: Number(refund.amount).toFixed(2),
      currency: refund.payment.currency,
      status,
    });
  }

  private async expirePendingPayments() {
    if (!this.config.get<boolean>('payments.enabled')) return;
    const expired = await this.prisma.payment.findMany({
      where: {
        status: {
          in: [
            PaymentRecordStatus.CREATED,
            PaymentRecordStatus.PENDING,
            PaymentRecordStatus.AUTHORIZED,
          ],
        },
        expiresAt: { lte: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
      take: 5,
    });
    for (const payment of expired) {
      try {
        const gatewayPayments = payment.gatewayOrderId
          ? await this.gateway.fetchPaymentsForOrder(payment.gatewayOrderId)
          : [];
        const captured = gatewayPayments.find(
          (item) => item.status === 'captured',
        );
        if (captured) {
          if (
            captured.amount !== this.toMinorUnits(payment.amount) ||
            captured.currency !== payment.currency
          ) {
            await this.prisma.paymentAuditLog.create({
              data: {
                paymentId: payment.id,
                eventType: 'EXPIRY_CHECK_AMOUNT_MISMATCH',
                previousStatus: payment.status,
                newStatus: payment.status,
                metadata: { gatewayPaymentId: captured.id },
              },
            });
            continue;
          }
          await this.confirmCapture(payment.id, captured);
          continue;
        }
        const authorized = gatewayPayments.find(
          (item) => item.status === 'authorized',
        );
        if (authorized) {
          const current = await this.gateway.fetchPayment(authorized.id);
          if (current.status === 'captured') {
            await this.confirmCapture(payment.id, current);
          } else if (current.status === 'authorized') {
            await this.prisma.payment.updateMany({
              where: {
                id: payment.id,
                status: {
                  in: [
                    PaymentRecordStatus.PENDING,
                    PaymentRecordStatus.AUTHORIZED,
                  ],
                },
              },
              data: {
                status: PaymentRecordStatus.AUTHORIZED,
                expiresAt: new Date(Date.now() + 15 * 60_000),
              },
            });
          }
          continue;
        }
        const latest = gatewayPayments.at(-1);
        if (latest?.status === 'failed') await this.markFailed(payment, latest);
        await this.prisma.$transaction(async (tx) => {
          const changed = await tx.payment.updateMany({
            where: {
              id: payment.id,
              status: {
                in: [
                  PaymentRecordStatus.CREATED,
                  PaymentRecordStatus.PENDING,
                  PaymentRecordStatus.AUTHORIZED,
                ],
              },
            },
            data: {
              status: PaymentRecordStatus.FAILED,
              failureReason: 'Payment attempt expired',
            },
          });
          if (changed.count === 1) {
            await tx.paymentAuditLog.create({
              data: {
                paymentId: payment.id,
                eventType: 'PAYMENT_EXPIRED',
                previousStatus: payment.status,
                newStatus: PaymentRecordStatus.FAILED,
              },
            });
            await tx.paymentOutboxEvent.create({
              data: {
                aggregateType: 'payment',
                aggregateId: payment.id,
                eventType: 'PAYMENT_FAILED',
                payload: { paymentId: payment.id },
              },
            });
          }
          const current = await tx.payment.findUniqueOrThrow({
            where: { id: payment.id },
          });
          if (current.status === PaymentRecordStatus.FAILED) {
            await tx.order.updateMany({
              where: {
                id: payment.orderId,
                orderStatus: 'PENDING',
                paymentStatus: 'PENDING',
              },
              data: { orderStatus: 'CANCELLED', paymentStatus: 'FAILED' },
            });
          }
        });
      } catch {
        this.logger.warn(`Payment expiry check deferred for ${payment.id}`);
      }
    }
  }

  private async fulfillCapturedPayment(input: { paymentId?: string }) {
    if (!input.paymentId)
      throw new BadRequestException('Payment outbox event has no payment ID');
    const payment = await this.prisma.payment.findUnique({
      where: { id: input.paymentId },
      include: {
        order: {
          include: {
            user: { include: { profile: true } },
            orderItems: { include: { product: true } },
            shipment: true,
          },
        },
      },
    });
    if (!payment || payment.status !== PaymentRecordStatus.CAPTURED)
      throw new BadRequestException('Captured payment record is unavailable');
    const invoice = await this.prisma.paymentInvoice.upsert({
      where: { orderId: payment.orderId },
      create: {
        orderId: payment.orderId,
        paymentId: payment.id,
        invoiceNumber: `INV-${payment.order.orderNumber}`,
        status: 'PENDING',
      },
      update: {},
    });
    let invoicePath = invoice.invoicePath;
    if (!invoicePath) {
      const shipment = payment.order.shipment[0];
      const pdf = await this.invoicePdf.generatePdf({
        invoiceId: invoice.invoiceNumber,
        billNumber: payment.order.orderNumber,
        name: payment.order.user.name ?? undefined,
        whatsappNumber:
          payment.order.user.profile?.mobileNumber ??
          shipment?.phone ??
          undefined,
        address: shipment?.shippingAddress,
        paymentMethod: 'Razorpay',
        subtotal: Number(payment.order.subtotal),
        discount: Number(payment.order.discount),
        tax: Number(payment.order.tax),
        total: Number(payment.order.totalAmount),
        createdAt: payment.paidAt ?? new Date(),
        items: payment.order.orderItems.map((item) => ({
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: Number(item.price),
          discount: Number(item.discount),
          tax: Number(item.tax),
          total: Number(item.total),
        })),
      });
      invoicePath = await this.storage.uploadFile({
        key: `order-invoices/${payment.orderId}/${invoice.invoiceNumber}.pdf`,
        buffer: pdf,
        mimeType: 'application/pdf',
        cacheControl: 'private, max-age=3600',
      });
      await this.prisma.paymentInvoice.update({
        where: { id: invoice.id },
        data: { invoicePath, status: 'READY' },
      });
    }
    const emailEnabled = this.config.get<boolean>(
      'payments.emailNotificationsEnabled',
    );
    if (emailEnabled && payment.order.user.email) {
      const paymentReference = payment.paymentReference;
      const invoiceUrl = invoicePath
        ? await this.storage.generateDownloadUrl(invoicePath, 600)
        : undefined;
      await this.email.sendOrderConfirmationEmail(payment.order.user.email, {
        orderId: payment.orderId,
        cancelled: payment.order.orderStatus === 'CANCELLED',
        orderNumber: payment.order.orderNumber,
        paymentReference,
        amount: Number(payment.amount).toFixed(2),
        currency: payment.currency,
        invoiceUrl,
        items: payment.order.orderItems.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          total: Number(item.total).toFixed(2),
        })),
      });
    }
  }

  private async processWebhookEvent(payload: Record<string, unknown>) {
    const event = payload.event;
    const paymentId = payload.paymentId;
    const orderId = payload.orderId;
    if (typeof event !== 'string')
      throw new BadRequestException('Webhook event type is missing');
    if (
      event === 'payment.captured' ||
      event === 'order.paid' ||
      event === 'payment.authorized' ||
      event === 'payment.failed'
    ) {
      if (typeof orderId !== 'string')
        throw new BadRequestException(
          'Webhook payment identifiers are missing',
        );
      const authoritativePayments =
        typeof paymentId === 'string'
          ? [await this.gateway.fetchPayment(paymentId)]
          : event === 'order.paid'
            ? await this.gateway.fetchPaymentsForOrder(orderId)
            : [];
      const actual =
        authoritativePayments.find(
          (candidate) => candidate.status === 'captured',
        ) ?? authoritativePayments[0];
      if (!actual) throw new NotFoundException('Gateway payment was not found');
      const payment = await this.prisma.payment.findUnique({
        where: { gatewayOrderId: orderId },
      });
      if (!payment)
        throw new NotFoundException('Payment for webhook event was not found');
      if (
        actual.order_id !== payment.gatewayOrderId ||
        actual.amount !== this.toMinorUnits(payment.amount) ||
        actual.currency !== payment.currency
      ) {
        throw new BadRequestException(
          'Authoritative gateway payment does not match internal payment',
        );
      }
      if (actual.status === 'captured') {
        await this.confirmCapture(payment.id, actual);
      } else if (
        actual.status === 'authorized' &&
        payment.status !== PaymentRecordStatus.CAPTURED
      ) {
        await this.markAuthorized(payment, actual);
      } else if (
        actual.status === 'failed' &&
        payment.status !== PaymentRecordStatus.CAPTURED
      ) {
        await this.markFailed(payment, actual);
      }
      return;
    }
    if (
      ['refund.created', 'refund.processed', 'refund.failed'].includes(event)
    ) {
      if (
        typeof payload.refundId !== 'string' ||
        typeof payload.refundPaymentId !== 'string'
      ) {
        throw new BadRequestException('Webhook refund identifiers are missing');
      }
      const refund = await this.prisma.refund.findUnique({
        where: { gatewayRefundId: payload.refundId },
      });
      if (!refund)
        throw new NotFoundException('Refund for webhook event was not found');
      const actual = await this.gateway.fetchRefund(
        payload.refundPaymentId,
        payload.refundId,
      );
      if (actual.amount !== this.toMinorUnits(refund.amount))
        throw new BadRequestException('Gateway refund amount mismatch');
      await this.syncRefundStatus(refund.id, actual.status);
      return;
    }
    if (
      !['refund.created', 'refund.processed', 'refund.failed'].includes(event)
    ) {
      this.logger.warn(`Ignoring unsupported Razorpay event ${event}`);
    }
  }

  async createRefund(
    paymentId: string,
    amount: number,
    actorId: string,
    idempotencyKey: string | undefined,
    reason?: string,
  ) {
    this.assertEnabled();
    if (!idempotencyKey || idempotencyKey.length > 128)
      throw new BadRequestException(
        'A valid Idempotency-Key header is required',
      );
    const previous = await this.prisma.refund.findUnique({
      where: { idempotencyKey },
    });
    if (previous) {
      if (
        previous.paymentId !== paymentId ||
        Number(previous.amount) !== amount
      )
        throw new BadRequestException(
          'Idempotency key is already associated with another refund',
        );
      return previous;
    }
    const refund = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM payments WHERE id = ${paymentId} FOR UPDATE`,
        );
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: {
            transactions: {
              where: {
                transactionType: PaymentTransactionType.CAPTURE,
                status: PaymentTransactionStatus.SUCCESS,
              },
            },
          },
        });
        if (!payment) throw new NotFoundException('Payment not found');
        if (
          payment.status !== PaymentRecordStatus.CAPTURED &&
          payment.status !== PaymentRecordStatus.PARTIALLY_REFUNDED
        )
          throw new BadRequestException(
            'Only captured payments can be refunded',
          );
        const capture = payment.transactions.at(-1);
        if (!capture?.gatewayPaymentId)
          throw new BadRequestException(
            'Captured gateway payment reference is unavailable',
          );
        const refunds = await tx.refund.findMany({
          where: {
            paymentId,
            status: {
              in: [PaymentRefundStatus.PENDING, PaymentRefundStatus.PROCESSED],
            },
          },
        });
        const reserved = refunds.reduce(
          (total, current) => total + Number(current.amount),
          0,
        );
        const normalizedAmount = Number(amount.toFixed(2));
        if (
          !Number.isFinite(normalizedAmount) ||
          normalizedAmount <= 0 ||
          normalizedAmount + reserved > Number(payment.amount) + 0.0001
        ) {
          throw new BadRequestException(
            'Refund amount exceeds the captured refundable balance',
          );
        }
        const created = await tx.refund.create({
          data: {
            paymentId,
            amount: normalizedAmount,
            reason,
            initiatedBy: actorId,
            idempotencyKey,
          },
        });
        await tx.payment.update({
          where: { id: paymentId },
          data: { status: PaymentRecordStatus.REFUND_PENDING },
        });
        await tx.paymentAuditLog.create({
          data: {
            paymentId,
            eventType: 'REFUND_INITIATED',
            previousStatus: payment.status,
            newStatus: PaymentRecordStatus.REFUND_PENDING,
            actorId,
            metadata: { refundId: created.id, amount: normalizedAmount },
          },
        });
        return { refund: created, gatewayPaymentId: capture.gatewayPaymentId };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // If the request times out after Razorpay accepted it, leave the refund pending for
    // webhook/reconciliation rather than issuing a second financial request.
    const gatewayRefund = await this.gateway.createRefund(
      refund.gatewayPaymentId,
      this.toMinorUnits(refund.refund.amount),
      refund.refund.id,
    );
    if (gatewayRefund.amount !== this.toMinorUnits(refund.refund.amount))
      throw new BadRequestException('Gateway refund amount mismatch');
    const savedRefund = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.refund.update({
        where: { id: refund.refund.id },
        data: { gatewayRefundId: gatewayRefund.id },
      });
      await tx.paymentOutboxEvent.create({
        data: {
          aggregateType: 'refund',
          aggregateId: updated.id,
          eventType: 'REFUND_INITIATED',
          payload: { refundId: updated.id },
        },
      });
      return updated;
    });
    await this.syncRefundStatus(savedRefund.id, gatewayRefund.status);
    return this.prisma.refund.findUniqueOrThrow({
      where: { id: savedRefund.id },
    });
  }

  private async syncRefundStatus(refundId: string, gatewayStatus: string) {
    const status =
      gatewayStatus === 'processed'
        ? PaymentRefundStatus.PROCESSED
        : gatewayStatus === 'failed'
          ? PaymentRefundStatus.FAILED
          : PaymentRefundStatus.PENDING;
    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUniqueOrThrow({
        where: { id: refundId },
        include: { payment: true },
      });
      if (refund.status === status) return refund;
      await tx.refund.update({
        where: { id: refundId },
        data: {
          status,
          refundedAt:
            status === PaymentRefundStatus.PROCESSED ? new Date() : null,
        },
      });
      const allRefunds = await tx.refund.findMany({
        where: { paymentId: refund.paymentId },
      });
      const processed = allRefunds.reduce(
        (total, item) =>
          total +
          (item.id === refundId
            ? status === PaymentRefundStatus.PROCESSED
              ? Number(item.amount)
              : 0
            : item.status === PaymentRefundStatus.PROCESSED
              ? Number(item.amount)
              : 0),
        0,
      );
      const pending = allRefunds.some((item) =>
        item.id === refundId
          ? status === PaymentRefundStatus.PENDING
          : item.status === PaymentRefundStatus.PENDING,
      );
      const paymentStatus =
        processed >= Number(refund.payment.amount)
          ? PaymentRecordStatus.REFUNDED
          : processed > 0
            ? PaymentRecordStatus.PARTIALLY_REFUNDED
            : pending
              ? PaymentRecordStatus.REFUND_PENDING
              : PaymentRecordStatus.CAPTURED;
      await tx.payment.update({
        where: { id: refund.paymentId },
        data: { status: paymentStatus },
      });
      if (paymentStatus === PaymentRecordStatus.REFUNDED) {
        await tx.order.update({
          where: { id: refund.payment.orderId },
          data: { paymentStatus: 'REFUNDED', orderStatus: 'REFUNDED' },
        });
      }
      await tx.paymentAuditLog.create({
        data: {
          paymentId: refund.paymentId,
          eventType: `REFUND_${status}`,
          previousStatus: refund.payment.status,
          newStatus: paymentStatus,
          metadata: { refundId, amount: Number(refund.amount) },
        },
      });
      if (
        status === PaymentRefundStatus.PROCESSED ||
        status === PaymentRefundStatus.FAILED
      ) {
        await tx.paymentOutboxEvent.create({
          data: {
            aggregateType: 'refund',
            aggregateId: refundId,
            eventType: `REFUND_${status}`,
            payload: { refundId },
          },
        });
      }
      return refund;
    });
  }

  adminPayments(status?: PaymentRecordStatus) {
    return this.prisma.payment.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        order: true,
        transactions: { orderBy: { createdAt: 'desc' } },
        refunds: true,
      },
    });
  }

  async adminPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: { include: { orderItems: { include: { product: true } } } },
        transactions: { orderBy: { createdAt: 'desc' } },
        refunds: true,
        auditLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  adminRefunds() {
    return this.prisma.refund.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { payment: true },
    });
  }

  adminRefund(id: string) {
    return this.prisma.refund.findUniqueOrThrow({
      where: { id },
      include: { payment: true },
    });
  }

  failedWebhooks() {
    return this.prisma.paymentWebhook.findMany({
      where: { processingStatus: PaymentWebhookStatus.FAILED },
      orderBy: { receivedAt: 'asc' },
      take: 100,
    });
  }

  async reprocessWebhook(id: string) {
    const result = await this.prisma.paymentWebhook.updateMany({
      where: { id, processingStatus: PaymentWebhookStatus.FAILED },
      data: {
        processingStatus: PaymentWebhookStatus.PENDING,
        processingAttempts: 0,
        nextAttemptAt: null,
        errorMessage: null,
      },
    });
    if (result.count !== 1)
      throw new NotFoundException('Failed webhook not found');
    return this.prisma.paymentWebhook.findUniqueOrThrow({ where: { id } });
  }

  failedOutboxEvents() {
    return this.prisma.paymentOutboxEvent.findMany({
      where: { processingStatus: 'FAILED' },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async reprocessOutboxEvent(id: string) {
    const result = await this.prisma.paymentOutboxEvent.updateMany({
      where: { id, processingStatus: 'FAILED' },
      data: {
        processingStatus: 'PENDING',
        retryCount: 0,
        nextAttemptAt: null,
      },
    });
    if (result.count !== 1)
      throw new NotFoundException('Failed outbox event not found');
    return this.prisma.paymentOutboxEvent.findUniqueOrThrow({ where: { id } });
  }

  async reconcile() {
    const candidates = await this.prisma.payment.findMany({
      where: {
        status: {
          in: [
            PaymentRecordStatus.PENDING,
            PaymentRecordStatus.AUTHORIZED,
            PaymentRecordStatus.FAILED,
            PaymentRecordStatus.CAPTURED,
          ],
        },
        gatewayOrderId: { not: null },
      },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    });
    const results: Array<Record<string, unknown>> = [];
    for (const payment of candidates) {
      try {
        const actualPayments = await this.gateway.fetchPaymentsForOrder(
          payment.gatewayOrderId!,
        );
        const actual =
          actualPayments.find((candidate) => candidate.status === 'captured') ??
          actualPayments.at(-1);
        if (!actual) {
          if (
            payment.status === PaymentRecordStatus.PENDING ||
            payment.status === PaymentRecordStatus.AUTHORIZED
          )
            results.push({
              paymentId: payment.id,
              issue: 'NO_GATEWAY_PAYMENT_ATTEMPT',
            });
          continue;
        }
        const capturedIds = actualPayments
          .filter((candidate) => candidate.status === 'captured')
          .map((candidate) => candidate.id);
        const issue =
          capturedIds.length > 1
            ? 'MULTIPLE_CAPTURED_GATEWAY_PAYMENTS'
            : actual.amount !== this.toMinorUnits(payment.amount) ||
                actual.currency !== payment.currency
              ? 'AMOUNT_OR_CURRENCY_MISMATCH'
              : actual.status === 'captured' &&
                  payment.status !== PaymentRecordStatus.CAPTURED &&
                  payment.status !== PaymentRecordStatus.PARTIALLY_REFUNDED &&
                  payment.status !== PaymentRecordStatus.REFUNDED
                ? 'CAPTURED_GATEWAY_PAYMENT_NOT_CAPTURED_INTERNALLY'
                : actual.status === 'failed' &&
                    payment.status !== PaymentRecordStatus.FAILED
                  ? 'FAILED_STATUS_MISMATCH'
                  : null;
        if (issue) {
          results.push({
            paymentId: payment.id,
            gatewayPaymentId: actual.id,
            issue,
            internalStatus: payment.status,
            gatewayStatus: actual.status,
          });
          await this.prisma.paymentAuditLog.create({
            data: {
              paymentId: payment.id,
              eventType: 'RECONCILIATION_DISCREPANCY',
              previousStatus: payment.status,
              newStatus: payment.status,
              metadata: {
                issue,
                gatewayPaymentId: actual.id,
                gatewayStatus: actual.status,
                capturedGatewayPaymentIds: capturedIds,
              },
            },
          });
        }
      } catch {
        results.push({ paymentId: payment.id, issue: 'GATEWAY_UNAVAILABLE' });
      }
    }
    return results;
  }

  private assertEnabled() {
    if (!this.config.get<boolean>('payments.enabled')) {
      throw new ServiceUnavailableException(
        'Online payments are temporarily unavailable',
      );
    }
  }

  async initiate(orderId: string, userId: string, idempotencyKey?: string) {
    this.assertEnabled();
    if (idempotencyKey && idempotencyKey.length > 128) {
      throw new BadRequestException(
        'Idempotency key must not exceed 128 characters',
      );
    }
    if (idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        if (existing.userId !== userId || existing.orderId !== orderId) {
          throw new ForbiddenException(
            'Idempotency key is already associated with another request',
          );
        }
        if (existing.gatewayOrderId) return this.checkoutResponse(existing);
        return this.createGatewayOrder(existing.id);
      }
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId)
      throw new ForbiddenException('Order does not belong to this user');
    if (order.orderStatus !== 'PENDING' || order.paymentStatus !== 'PENDING') {
      throw new BadRequestException('Order is not eligible for payment');
    }
    if (order.paymentMethod !== 'RAZORPAY') {
      throw new BadRequestException('Order is not configured for Razorpay');
    }
    const activePayment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        status: {
          in: [
            PaymentRecordStatus.CREATED,
            PaymentRecordStatus.PENDING,
            PaymentRecordStatus.AUTHORIZED,
            PaymentRecordStatus.CAPTURED,
            PaymentRecordStatus.REFUND_PENDING,
            PaymentRecordStatus.PARTIALLY_REFUNDED,
          ],
        },
      },
    });
    if (activePayment) {
      if (
        activePayment.status === PaymentRecordStatus.CAPTURED ||
        activePayment.status === PaymentRecordStatus.REFUND_PENDING ||
        activePayment.status === PaymentRecordStatus.PARTIALLY_REFUNDED
      ) {
        throw new BadRequestException('Order already has a successful payment');
      }
      if (activePayment.gatewayOrderId)
        return this.checkoutResponse(activePayment);
      return this.createGatewayOrder(activePayment.id);
    }
    if (!order.orderItems.length)
      throw new BadRequestException('Order has no items');

    // Stored order values are server-computed snapshots. Reject checkout if the catalog has
    // changed since order creation instead of silently charging a stale or client supplied price.
    const money = (value: number) =>
      Math.round((value + Number.EPSILON) * 100) / 100;
    for (const item of order.orderItems) {
      const catalogPrice = Number(item.product.finalPrice);
      const priceAfterDiscount =
        Number(item.price) - Number(item.discount) / item.quantity;
      const expectedDiscount =
        Math.max(0, Number(item.product.basePrice) - catalogPrice) *
        item.quantity;
      const expectedTax =
        (catalogPrice * item.quantity * Number(item.product.taxPercentage)) /
        100;
      if (
        Math.abs(priceAfterDiscount - catalogPrice) > 0.01 ||
        Math.abs(Number(item.discount) - money(expectedDiscount)) > 0.01 ||
        Math.abs(Number(item.tax) - money(expectedTax)) > 0.01 ||
        item.product.deletedAt
      ) {
        throw new BadRequestException(
          'Order pricing changed; create a new order before paying',
        );
      }
      if (item.product.availableStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.product.name}`,
        );
      }
    }
    const calculatedTotal = money(
      order.orderItems.reduce((total, item) => total + Number(item.total), 0) +
        Number(order.shippingCharge),
    );
    if (Math.abs(calculatedTotal - Number(order.totalAmount)) > 0.01) {
      throw new BadRequestException(
        'Order total does not match item pricing; create a new order before paying',
      );
    }
    const amountMinor = this.toMinorUnits(order.totalAmount);
    if (amountMinor <= 0)
      throw new BadRequestException('Payment amount must be positive');
    const currency = this.config.get<string>('payments.currency') ?? 'INR';
    let payment: { id: string };
    try {
      payment = await this.prisma.payment.create({
        data: {
          orderId,
          userId,
          paymentReference: `luuna_${randomUUID().replaceAll('-', '')}`,
          amount: order.totalAmount,
          currency,
          status: PaymentRecordStatus.CREATED,
          expiresAt: new Date(
            Date.now() +
              (this.config.get<number>('payments.expirationMinutes') ?? 30) *
                60_000,
          ),
          idempotencyKey,
          transactions: {
            create: {
              transactionType: PaymentTransactionType.ATTEMPT,
              amount: order.totalAmount,
              currency,
              status: PaymentTransactionStatus.PENDING,
            },
          },
          auditLogs: {
            create: {
              eventType: 'PAYMENT_INITIATED',
              newStatus: PaymentRecordStatus.CREATED,
              actorId: userId,
              metadata: { orderId },
            },
          },
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
      const racedPayment = await this.prisma.payment.findFirst({
        where: {
          orderId,
          status: {
            in: [
              PaymentRecordStatus.CREATED,
              PaymentRecordStatus.PENDING,
              PaymentRecordStatus.AUTHORIZED,
              PaymentRecordStatus.CAPTURED,
              PaymentRecordStatus.REFUND_PENDING,
              PaymentRecordStatus.PARTIALLY_REFUNDED,
            ],
          },
        },
      });
      if (!racedPayment)
        throw new BadRequestException(
          'Idempotency key is already associated with another request',
        );
      if (racedPayment.gatewayOrderId)
        return this.checkoutResponse(racedPayment);
      return this.createGatewayOrder(racedPayment.id);
    }
    return this.createGatewayOrder(payment.id);
  }

  private async createGatewayOrder(paymentId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "payments" WHERE id = ${paymentId} FOR UPDATE`;
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: paymentId },
          include: {
            order: { select: { orderStatus: true, paymentStatus: true } },
          },
        });
        if (
          payment.order.orderStatus !== 'PENDING' ||
          payment.order.paymentStatus !== 'PENDING' ||
          !['CREATED', 'PENDING'].includes(payment.status)
        ) {
          throw new BadRequestException('Order is not eligible for payment.');
        }
        if (payment.gatewayOrderId) return this.checkoutResponse(payment);
        const order = await this.gateway.createOrder({
          amount: this.toMinorUnits(payment.amount),
          currency: payment.currency,
          receipt: payment.paymentReference,
        });
        if (
          order.amount !== this.toMinorUnits(payment.amount) ||
          order.currency !== payment.currency
        ) {
          throw new BadRequestException(
            'Gateway order amount or currency mismatch',
          );
        }
        const updated = await tx.payment.update({
          where: { id: paymentId },
          data: {
            gatewayOrderId: order.id,
            status: PaymentRecordStatus.PENDING,
          },
        });
        return this.checkoutResponse(updated);
      },
      { timeout: 15_000 },
    );
  }

  private checkoutResponse(payment: {
    id: string;
    paymentReference: string;
    gatewayOrderId: string | null;
    amount: Prisma.Decimal;
    currency: string;
  }) {
    return {
      paymentId: payment.id,
      paymentReference: payment.paymentReference,
      razorpayOrderId: payment.gatewayOrderId,
      amount: this.toMinorUnits(payment.amount),
      currency: payment.currency,
      keyId: this.config.get<string>('payments.razorpayKeyId'),
    };
  }

  async verify(userId: string, input: VerifyPaymentDto) {
    this.assertEnabled();
    const payment = await this.prisma.payment.findUnique({
      where: { gatewayOrderId: input.razorpay_order_id },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId)
      throw new ForbiddenException('Payment does not belong to this user');
    if (
      !this.gateway.verifyPaymentSignature(
        input.razorpay_order_id,
        input.razorpay_payment_id,
        input.razorpay_signature,
      )
    ) {
      throw new BadRequestException('Payment signature is invalid');
    }

    const gatewayPayment = await this.gateway.fetchPayment(
      input.razorpay_payment_id,
    );
    if (
      gatewayPayment.order_id !== payment.gatewayOrderId ||
      gatewayPayment.amount !== this.toMinorUnits(payment.amount) ||
      gatewayPayment.currency !== payment.currency
    ) {
      throw new BadRequestException(
        'Gateway payment does not match the expected order, amount, or currency',
      );
    }
    if (gatewayPayment.status === 'authorized') {
      await this.markAuthorized(payment, gatewayPayment);
      return { status: PaymentRecordStatus.AUTHORIZED, paymentId: payment.id };
    }
    if (gatewayPayment.status !== 'captured') {
      if (gatewayPayment.status === 'failed') {
        await this.markFailed(payment, gatewayPayment);
      }
      return { status: gatewayPayment.status, paymentId: payment.id };
    }
    return this.confirmCapture(payment.id, gatewayPayment);
  }

  private async markAuthorized(
    payment: {
      id: string;
      amount: Prisma.Decimal;
      currency: string;
      status: PaymentRecordStatus;
    },
    gatewayPayment: {
      id: string;
      amount: number;
      currency: string;
      status: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: {
            in: [PaymentRecordStatus.CREATED, PaymentRecordStatus.PENDING],
          },
        },
        data: { status: PaymentRecordStatus.AUTHORIZED },
      });
      if (changed.count !== 1) return;
      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          gatewayPaymentId: gatewayPayment.id,
          transactionType: PaymentTransactionType.AUTHORIZATION,
          amount: payment.amount,
          currency: payment.currency,
          status: PaymentTransactionStatus.SUCCESS,
          gatewayResponse: {
            id: gatewayPayment.id,
            status: gatewayPayment.status,
          },
        },
      });
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          eventType: 'PAYMENT_AUTHORIZED',
          previousStatus: payment.status,
          newStatus: PaymentRecordStatus.AUTHORIZED,
        },
      });
    });
  }

  private async markFailed(
    payment: {
      id: string;
      amount: Prisma.Decimal;
      currency: string;
      status: PaymentRecordStatus;
    },
    gatewayPayment: { id: string; status: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: {
            in: [
              PaymentRecordStatus.CREATED,
              PaymentRecordStatus.PENDING,
              PaymentRecordStatus.AUTHORIZED,
            ],
          },
        },
        data: {
          status: PaymentRecordStatus.FAILED,
          failureReason: 'Gateway reported payment failed',
        },
      });
      if (changed.count !== 1) return;
      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          gatewayPaymentId: gatewayPayment.id,
          transactionType: PaymentTransactionType.FAILURE,
          amount: payment.amount,
          currency: payment.currency,
          status: PaymentTransactionStatus.FAILED,
          gatewayResponse: {
            id: gatewayPayment.id,
            status: gatewayPayment.status,
          },
        },
      });
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          eventType: 'PAYMENT_FAILED',
          previousStatus: payment.status,
          newStatus: PaymentRecordStatus.FAILED,
        },
      });
      await tx.paymentOutboxEvent.create({
        data: {
          aggregateType: 'payment',
          aggregateId: payment.id,
          eventType: 'PAYMENT_FAILED',
          payload: { paymentId: payment.id },
        },
      });
    });
  }

  private async confirmCapture(
    paymentId: string,
    gatewayPayment: {
      id: string;
      amount: number;
      currency: string;
      method?: string;
    },
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: paymentId },
        });
        if (
          payment.status === PaymentRecordStatus.CAPTURED ||
          payment.status === PaymentRecordStatus.PARTIALLY_REFUNDED ||
          payment.status === PaymentRecordStatus.REFUNDED
        ) {
          const existing = await tx.paymentTransaction.findFirst({
            where: {
              paymentId,
              gatewayPaymentId: gatewayPayment.id,
              transactionType: PaymentTransactionType.CAPTURE,
            },
          });
          if (!existing && payment.status === PaymentRecordStatus.CAPTURED) {
            await tx.paymentTransaction.create({
              data: {
                paymentId,
                gatewayPaymentId: gatewayPayment.id,
                transactionType: PaymentTransactionType.CAPTURE,
                amount: payment.amount,
                currency: payment.currency,
                status: PaymentTransactionStatus.SUCCESS,
                gatewayResponse: {
                  id: gatewayPayment.id,
                  amount: gatewayPayment.amount,
                  currency: gatewayPayment.currency,
                  status: 'captured',
                },
              },
            });
            await tx.paymentAuditLog.create({
              data: {
                paymentId,
                eventType: 'DUPLICATE_CAPTURE_REQUIRES_REVIEW',
                previousStatus: payment.status,
                newStatus: payment.status,
                metadata: { gatewayPaymentId: gatewayPayment.id },
              },
            });
            await tx.paymentOutboxEvent.create({
              data: {
                aggregateType: 'payment',
                aggregateId: paymentId,
                eventType: 'DUPLICATE_CAPTURE_DETECTED',
                payload: { paymentId, gatewayPaymentId: gatewayPayment.id },
              },
            });
          }
          return { status: payment.status, paymentId };
        }
        if (
          gatewayPayment.amount !== this.toMinorUnits(payment.amount) ||
          gatewayPayment.currency !== payment.currency
        ) {
          throw new BadRequestException(
            'Captured amount or currency does not match payment',
          );
        }
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentRecordStatus.CAPTURED,
            paidAt: new Date(),
            paymentMethod: gatewayPayment.method,
            failureReason: null,
          },
        });
        await tx.paymentTransaction.create({
          data: {
            paymentId,
            gatewayPaymentId: gatewayPayment.id,
            transactionType: PaymentTransactionType.CAPTURE,
            amount: payment.amount,
            currency: payment.currency,
            status: PaymentTransactionStatus.SUCCESS,
            gatewayResponse: {
              id: gatewayPayment.id,
              amount: gatewayPayment.amount,
              currency: gatewayPayment.currency,
              status: 'captured',
            },
          },
        });
        const order = await tx.order.findUniqueOrThrow({
          where: { id: payment.orderId },
          select: {
            orderStatus: true,
            orderNumber: true,
            orderedAt: true,
            orderItems: { select: { productId: true, quantity: true } },
          },
        });
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: 'PAID',
            ...(order.orderStatus === 'PENDING'
              ? { orderStatus: 'PROCESSING' }
              : {}),
          },
        });
        if (
          order.orderNumber === `WEB-${payment.orderId}` &&
          order.orderStatus === 'PENDING'
        ) {
          await tx.cartItem.deleteMany({
            where: {
              cart: { userId: payment.userId },
              updatedAt: { lte: order.orderedAt },
              OR: order.orderItems.map(({ productId, quantity }) => ({
                productId,
                quantity,
              })),
            },
          });
        }
        await tx.paymentAuditLog.create({
          data: {
            paymentId,
            eventType:
              order.orderStatus === 'CANCELLED'
                ? 'PAYMENT_CAPTURED_AFTER_ORDER_CANCELLATION'
                : 'PAYMENT_CAPTURED',
            previousStatus: payment.status,
            newStatus: PaymentRecordStatus.CAPTURED,
          },
        });
        await tx.paymentOutboxEvent.create({
          data: {
            aggregateType: 'payment',
            aggregateId: paymentId,
            eventType: 'PAYMENT_CAPTURED',
            payload: { paymentId, orderId: payment.orderId },
          },
        });
        return { status: PaymentRecordStatus.CAPTURED, paymentId };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async findOwned(id: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        transactions: { orderBy: { createdAt: 'desc' } },
        refunds: true,
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId)
      throw new ForbiddenException('Payment does not belong to this user');
    return payment;
  }

  async invoiceDownload(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId) {
      throw new ForbiddenException('Payment does not belong to this user');
    }
    if (payment.invoice?.status !== 'READY' || !payment.invoice.invoicePath) {
      throw new NotFoundException('Invoice is not available yet');
    }
    return {
      url: await this.storage.generateDownloadUrl(
        payment.invoice.invoicePath,
        600,
      ),
    };
  }

  history(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });
  }

  private toMinorUnits(amount: Prisma.Decimal | number | string): number {
    const value = Number(amount);
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      Math.round(value * 100) > Number.MAX_SAFE_INTEGER
    ) {
      throw new BadRequestException('Invalid payment amount');
    }
    return Math.round(value * 100);
  }
}
