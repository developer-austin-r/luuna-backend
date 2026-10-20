import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SendWhatsAppDto, WhatsAppChannel } from './dto';

export interface WhatsAppSendResult {
  success: boolean;
  phone: string;
  logId: string;
  messageId?: string;
  error?: string;
}

/**
 * Sends approved WhatsApp template messages through Meta's Cloud API and
 * persists each attempt to the `whatsapp_message_logs` table.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Send a template message through Meta and persist the result.
   *
   * @param dto      Message payload
   * @param sentBy   User ID of the staff member triggering the send
   */
  async send(
    dto: SendWhatsAppDto,
    sentBy?: string,
  ): Promise<WhatsAppSendResult> {
    const {
      phone,
      templateParameters,
      channel = WhatsAppChannel.BILLING,
      entityId,
    } = dto;
    const normalizedPhone = this.normalizePhone(phone);
    const templateName = this.config.get<string>(
      'WHATSAPP_TEMPLATE_NAME',
      'jaspers_market_order_confirmation_v1',
    );
    const log = await this.prisma.whatsAppMessageLog.create({
      data: {
        phone: normalizedPhone,
        message: `${templateName}: ${templateParameters
          .map((value, index) => `{{${index + 1}}} ${value}`)
          .join(' | ')}`,
        status: 'PENDING',
        channel,
        entityId: entityId ?? null,
        sentBy: sentBy ?? null,
      },
      select: { id: true },
    });

    try {
      const accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
      const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
      const apiVersion = this.config.get<string>(
        'WHATSAPP_API_VERSION',
        'v25.0',
      );
      const templateLanguage = this.config.get<string>(
        'WHATSAPP_TEMPLATE_LANGUAGE',
        'en_US',
      );

      if (!accessToken || !phoneNumberId) {
        throw new ServiceUnavailableException(
          'WhatsApp Cloud API is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID on the backend.',
        );
      }

      const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: normalizedPhone,
            type: 'template',
            template: {
              name: templateName,
              language: { code: templateLanguage },
              components: [
                {
                  type: 'body',
                  parameters: templateParameters.map((text) => ({
                    type: 'text',
                    text,
                  })),
                },
              ],
            },
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );
      const result = (await response.json()) as MetaWhatsAppResponse;

      if (!response.ok) {
        const apiError =
          result.error?.message ?? `Meta API returned HTTP ${response.status}`;
        throw new Error(apiError);
      }

      const messageId = result.messages?.[0]?.id;
      if (!messageId) {
        throw new Error('Meta API response did not include a message ID.');
      }

      await this.prisma.whatsAppMessageLog.update({
        where: { id: log.id },
        data: { status: 'SENT', errorMessage: null },
      });
      this.logger.log(
        `WhatsApp template accepted by Meta [${channel}${entityId ? `:${entityId}` : ''}]`,
      );

      return {
        success: true,
        phone: normalizedPhone,
        logId: log.id,
        messageId,
      };
    } catch (err) {
      const error =
        err instanceof Error ? err.message : 'Unknown WhatsApp API error';
      await this.prisma.whatsAppMessageLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', errorMessage: error },
      });
      this.logger.error(
        `WhatsApp Cloud API send failed for log ${log.id}: ${error}`,
      );
      return { success: false, phone: normalizedPhone, logId: log.id, error };
    }
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
}

interface MetaWhatsAppResponse {
  messages?: Array<{ id: string }>;
  error?: { message?: string };
}
