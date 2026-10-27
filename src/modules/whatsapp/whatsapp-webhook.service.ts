import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  MetaWebhookPayload,
  MetaMessageStatus,
  MetaIncomingMessage,
} from './dto';
import { STATUS_PRIORITY, META_STATUS_MAP } from './dto';

/**
 * Handles Meta WhatsApp Cloud API webhook events:
 *  - GET  verification handshake
 *  - POST delivery status updates  (sent → delivered → read | failed)
 *  - POST inbound customer messages (stored as INBOUND channel logs)
 */
@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── GET /whatsapp/webhook ────────────────────────────────────────────────

  /**
   * Validates Meta's hub challenge verification request.
   * Returns the hub.challenge string on success, or null on failure.
   *
   * @param mode      hub.mode query param (must be "subscribe")
   * @param token     hub.verify_token query param
   * @param challenge hub.challenge query param
   */
  verifySubscription(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): string | null {
    const expectedToken = this.config.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

    if (!expectedToken) {
      this.logger.error(
        'WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set — cannot verify webhook subscription.',
      );
      return null;
    }

    if (mode === 'subscribe' && token === expectedToken) {
      this.logger.log('WhatsApp webhook subscription verified successfully.');
      return challenge ?? null;
    }

    this.logger.warn(
      `Webhook verification failed: mode=${mode ?? 'undefined'}, token_match=${token === expectedToken}`,
    );
    return null;
  }

  // ─── POST /whatsapp/webhook ───────────────────────────────────────────────

  /**
   * Entry point for all inbound webhook events.
   * Fans out to the appropriate handler per change entry.
   * Always resolves without throwing so Meta always receives 200 OK.
   */
  async processPayload(payload: MetaWebhookPayload): Promise<void> {
    if (payload.object !== 'whatsapp_business_account') {
      this.logger.warn(
        `Unexpected webhook object type: ${payload.object} — ignoring.`,
      );
      return;
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') {
          this.logger.debug(`Ignoring webhook field: ${change.field}`);
          continue;
        }

        const value = change.value;

        // Handle delivery status updates
        for (const status of value.statuses ?? []) {
          await this.handleStatusUpdate(status).catch((err: unknown) => {
            this.logger.error(
              `Error processing status update for wamid ${status.id}: ${String(err)}`,
            );
          });
        }

        // Handle inbound customer messages
        for (const message of value.messages ?? []) {
          await this.handleIncomingMessage(message, value.metadata?.phone_number_id).catch(
            (err: unknown) => {
              this.logger.error(
                `Error processing inbound message ${message.id}: ${String(err)}`,
              );
            },
          );
        }
      }
    }
  }

  // ─── Private handlers ─────────────────────────────────────────────────────

  /**
   * Updates the delivery status of an outbound message log.
   *
   * Safety guarantees:
   *  1. Idempotent — re-processing the same status is a no-op.
   *  2. Out-of-order safe — we never downgrade a status (e.g. READ → DELIVERED).
   *  3. Failed errors — stored in errorMessage for observability.
   */
  private async handleStatusUpdate(status: MetaMessageStatus): Promise<void> {
    const newStatus = META_STATUS_MAP[status.status];
    if (!newStatus) {
      this.logger.warn(`Unrecognised Meta status "${status.status}" — skipping.`);
      return;
    }

    // Find the log row by the wamid stored when the message was sent.
    const log = await this.prisma.whatsAppMessageLog.findUnique({
      where: { whatsappMessageId: status.id },
      select: { id: true, status: true },
    });

    if (!log) {
      // Could be a message sent outside this system, or the wamid was never stored.
      this.logger.debug(
        `No log found for wamid ${status.id} (status: ${status.status}) — skipping.`,
      );
      return;
    }

    const currentPriority = STATUS_PRIORITY[log.status] ?? -1;
    const newPriority = STATUS_PRIORITY[newStatus] ?? -1;

    // Idempotency: same status, nothing to do.
    if (log.status === newStatus) {
      this.logger.debug(`wamid ${status.id} already at status ${newStatus} — skipping.`);
      return;
    }

    // Out-of-order protection: never downgrade (e.g. READ → DELIVERED).
    if (newPriority < currentPriority) {
      this.logger.warn(
        `Out-of-order status for wamid ${status.id}: ${log.status} → ${newStatus} rejected.`,
      );
      return;
    }

    const errorMessage =
      status.errors && status.errors.length > 0
        ? status.errors.map((e) => `[${e.code}] ${e.title}`).join('; ')
        : null;

    await this.prisma.whatsAppMessageLog.update({
      where: { id: log.id },
      data: {
        status: newStatus as 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
        statusUpdatedAt: new Date(Number(status.timestamp) * 1000),
        ...(errorMessage !== null ? { errorMessage } : {}),
      },
    });

    this.logger.log(
      `wamid ${status.id} status updated: ${log.status} → ${newStatus}`,
    );
  }

  /**
   * Stores an inbound customer message as a WhatsAppMessageLog entry
   * with channel="INBOUND" so it is queryable via the existing log API.
   *
   * Duplicate protection: we use the Meta message ID (wamid) as the
   * unique `whatsappMessageId`, so a duplicate webhook delivery results in
   * a Prisma unique-constraint conflict that we silently absorb.
   */
  private async handleIncomingMessage(
    message: MetaIncomingMessage,
    phoneNumberId?: string,
  ): Promise<void> {
    // Extract a human-readable body from whatever message type arrived.
    const body = this.extractMessageBody(message);

    this.logger.log(
      `Inbound WhatsApp from ${message.from} (${message.type}): "${body.slice(0, 80)}"`,
    );

    try {
      await this.prisma.whatsAppMessageLog.create({
        data: {
          phone: message.from,
          message: body,
          status: 'SENT', // "sent" from customer's perspective; no outbound action
          channel: 'INBOUND',
          entityId: phoneNumberId ?? null,
          whatsappMessageId: message.id,
          statusUpdatedAt: new Date(Number(message.timestamp) * 1000),
        },
      });
    } catch (err: unknown) {
      // P2002 = unique constraint violation (duplicate wamid) — expected on re-delivery.
      const isPrismaConflict =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002';

      if (isPrismaConflict) {
        this.logger.debug(
          `Duplicate inbound message ignored: wamid ${message.id}`,
        );
        return;
      }
      throw err;
    }
  }

  /** Returns a plain-text summary of an inbound message for logging/storage. */
  private extractMessageBody(message: MetaIncomingMessage): string {
    switch (message.type) {
      case 'text':
        return message.text?.body ?? '';
      case 'image':
        return `[Image] ${message.image?.caption ?? ''}`.trim();
      case 'document':
        return `[Document] ${message.document?.filename ?? message.document?.id ?? ''}`.trim();
      case 'audio':
        return '[Audio]';
      case 'video':
        return `[Video] ${message.video?.caption ?? ''}`.trim();
      case 'sticker':
        return '[Sticker]';
      case 'location':
        return `[Location] ${message.location?.name ?? ''} (${message.location?.latitude ?? ''}, ${message.location?.longitude ?? ''})`.trim();
      case 'interactive':
        return `[Interactive] type=${message.interactive?.type ?? ''}`;
      case 'button':
        return `[Button] ${message.button?.text ?? ''} | payload=${message.button?.payload ?? ''}`.trim();
      default:
        return `[${message.type}]`;
    }
  }
}
