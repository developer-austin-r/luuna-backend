import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import {
  getWelcomeTemplate,
  getVerificationTemplate,
  getForgotPasswordTemplate,
  getPasswordChangedTemplate,
} from './email.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly senderEmail: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('aws.sesRegion');
    const accessKeyId = this.configService.get<string>('aws.sesAccessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.sesSecretAccessKey',
    );
    this.senderEmail =
      this.configService.get<string>('aws.sesSender') || 'noreply@luuna.com';

    this.sesClient = new SESClient({
      region: region,
      credentials: {
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
      },
    });
  }

  async sendEmail(to: string, subject: string, htmlContent: string) {
    const command = new SendEmailCommand({
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: htmlContent,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        },
      },
      Source: this.senderEmail,
    });

    try {
      if (process.env.NODE_ENV !== 'test') {
        const response = await this.sesClient.send(command);
        this.logger.log(
          `Email sent to ${to}, MessageId: ${response.MessageId}`,
        );
      } else {
        this.logger.log(`Skipped sending email to ${to} in test environment`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}`,
        (error as Error).stack,
      );
    }
  }

  async sendEmailStrict(to: string, subject: string, htmlContent: string) {
    if (process.env.NODE_ENV === 'test') return;
    const command = new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Body: { Html: { Charset: 'UTF-8', Data: htmlContent } },
        Subject: { Charset: 'UTF-8', Data: subject },
      },
      Source: this.senderEmail,
    });
    const response = await this.sesClient.send(command);
    this.logger.log(
      `Transactional email sent, MessageId: ${response.MessageId}`,
    );
  }

  async sendOrderConfirmationEmail(
    to: string,
    details: {
      orderNumber: string;
      paymentReference: string;
      amount: string;
      currency: string;
      invoiceUrl?: string;
      items: Array<{ name: string; quantity: number; total: string }>;
    },
  ) {
    const safe = (value: string) =>
      value.replace(
        /[&<>"']/g,
        (character) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[character]!,
      );
    const itemRows = details.items
      .map(
        (item) =>
          `<tr><td>${safe(item.name)}</td><td>${item.quantity}</td><td>${safe(item.total)}</td></tr>`,
      )
      .join('');
    const invoice = details.invoiceUrl
      ? `<p><a href="${safe(details.invoiceUrl)}">Download invoice</a></p>`
      : '';
    const html = `<h1>Order confirmed</h1><p>Order ${safe(details.orderNumber)} is confirmed.</p><p>Payment reference: ${safe(details.paymentReference)}</p><p>Paid: ${safe(details.currency)} ${safe(details.amount)}</p><table><thead><tr><th>Product</th><th>Qty</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table>${invoice}`;
    await this.sendEmailStrict(
      to,
      `Order confirmed: ${details.orderNumber}`,
      html,
    );
  }

  async sendPaymentFailureEmail(
    to: string,
    details: { orderNumber: string; paymentReference: string },
  ) {
    const safe = (value: string) =>
      value.replace(
        /[&<>"']/g,
        (character) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[character]!,
      );
    const html = `<h1>Payment not completed</h1><p>Payment for order ${safe(details.orderNumber)} was not completed.</p><p>Reference: ${safe(details.paymentReference)}</p><p>You can retry payment from your account order page. Do not share payment credentials with anyone.</p>`;
    await this.sendEmailStrict(
      to,
      `Payment not completed: ${details.orderNumber}`,
      html,
    );
  }

  async sendRefundUpdateEmail(
    to: string,
    details: {
      orderNumber: string;
      amount: string;
      currency: string;
      status: 'initiated' | 'processed' | 'failed';
    },
  ) {
    const safe = (value: string) =>
      value.replace(
        /[&<>"']/g,
        (character) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[character]!,
      );
    const html = `<h1>Refund ${safe(details.status)}</h1><p>Refund for order ${safe(details.orderNumber)}: ${safe(details.currency)} ${safe(details.amount)}.</p><p>A processed refund may take additional time to appear in your account, depending on your bank.</p>`;
    await this.sendEmailStrict(
      to,
      `Refund ${details.status}: ${details.orderNumber}`,
      html,
    );
  }

  async sendWelcomeEmail(to: string, name: string) {
    const html = getWelcomeTemplate(name);
    await this.sendEmail(to, 'Welcome to Luuna!', html);
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const verificationUrl = `${this.configService.get<string>('auth.frontendVerificationUrl')}?token=${token}`;
    console.log('verificationUrl', verificationUrl);
    const html = getVerificationTemplate(name, verificationUrl);
    await this.sendEmail(to, 'Verify your email address - Luuna', html);
  }

  async sendForgotPasswordEmail(to: string, name: string, token: string) {
    const resetUrl = `${this.configService.get<string>('auth.frontendResetUrl')}?token=${token}`;
    const html = getForgotPasswordTemplate(name, resetUrl);
    await this.sendEmail(to, 'Password Reset Request - Luuna', html);
  }

  async sendPasswordChangedEmail(to: string, name: string) {
    const html = getPasswordChangedTemplate(name);
    await this.sendEmail(to, 'Your password has been changed - Luuna', html);
  }
}
