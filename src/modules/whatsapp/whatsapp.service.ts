import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendWhatsAppDto, WhatsAppChannel } from './dto';

export interface WhatsAppSendResult {
  success: boolean;
  phone: string;
  logId: string;
  url?: string;
  error?: string;
}

/**
 * WhatsAppService — reusable service for sending WhatsApp messages via
 * the wa.me deep-link strategy and persisting every attempt to the
 * `whatsapp_message_logs` table.
 *
 * This service is intentionally transport-agnostic. The `url` returned
 * in the result is the wa.me link that the frontend can open.  When a
 * real WhatsApp Business API key is wired up later, swap out the
 * _buildUrl() implementation without touching callers.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send (log) a WhatsApp message and persist the attempt.
   *
   * @param dto      Message payload
   * @param sentBy   User ID of the staff member triggering the send
   */
  async send(
    dto: SendWhatsAppDto,
    sentBy?: string,
  ): Promise<WhatsAppSendResult> {
    const { phone, message, channel = WhatsAppChannel.BILLING, entityId } = dto;

    const normalizedPhone = this.normalizePhone(phone);
    const url = this.buildUrl(normalizedPhone, message);

    let logId: string;
    try {
      const log = await this.prisma.whatsAppMessageLog.create({
        data: {
          phone: normalizedPhone,
          message,
          status: 'SENT',
          channel,
          entityId: entityId ?? null,
          sentBy: sentBy ?? null,
        },
        select: { id: true },
      });
      logId = log.id;
      this.logger.log(
        `WhatsApp link generated for ${normalizedPhone} [${channel}${entityId ? `:${entityId}` : ''}]`,
      );
    } catch (err) {
      this.logger.error('Failed to persist WhatsApp log', err);
      // Still return something useful even if DB write fails
      return {
        success: false,
        phone: normalizedPhone,
        logId: '',
        url,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    return { success: true, phone: normalizedPhone, logId, url };
  }

  /**
   * Fetch message history for a given phone number or entity.
   */
  async getLogs(opts: {
    phone?: string;
    channel?: string;
    entityId?: string;
    page?: number;
    limit?: number;
  }) {
    const { phone, channel, entityId, page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;

    const where = {
      ...(phone ? { phone: { contains: phone } } : {}),
      ...(channel ? { channel } : {}),
      ...(entityId ? { entityId } : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.whatsAppMessageLog.count({ where }),
      this.prisma.whatsAppMessageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Private helpers ──────────────────────────────────────────

  /** Strips non-digits; prepends 91 if 10-digit Indian number. */
  private normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }

  /** Builds a wa.me deep-link URL. */
  private buildUrl(phone: string, text: string): string {
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }
}
