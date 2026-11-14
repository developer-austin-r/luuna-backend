import { Injectable, Logger } from '@nestjs/common';
import { CreateSupportInquiryDto } from './dto/create-support-inquiry.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Validates and processes a customer support inquiry.
   * Logs the inquiry and routes an email notification to the support team.
   */
  async submitInquiry(dto: CreateSupportInquiryDto) {
    const inquiryId = `INQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const category = dto.category || dto.subject || 'General Inquiry';

    this.logger.log(
      `[Support Desk] New customer inquiry received #${inquiryId} from ${dto.name} <${dto.email}> for "${category}"`,
    );

    // Route inquiry to support desk email if configured
    try {
      const emailBody = `
        <h2>New Customer Support Inquiry</h2>
        <p><strong>Inquiry ID:</strong> ${inquiryId}</p>
        <p><strong>Customer Name:</strong> ${dto.name}</p>
        <p><strong>Customer Email:</strong> ${dto.email}</p>
        <p><strong>Category / Subject:</strong> ${category}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="background: #f4f4f4; padding: 12px; border-left: 4px solid #6B21A8;">
          ${dto.message.replace(/\n/g, '<br/>')}
        </blockquote>
      `;

      await this.emailService.sendEmail(
        process.env.SUPPORT_EMAIL || 'luuna@gmail.com',
        `[Support Inquiry #${inquiryId}] ${category} - ${dto.name}`,
        emailBody,
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to dispatch support email notification: ${errorMsg}`,
      );
    }

    return {
      success: true,
      inquiryId,
      message:
        'Support inquiry received successfully. Our team will contact you shortly.',
      receivedAt: new Date().toISOString(),
    };
  }
}
