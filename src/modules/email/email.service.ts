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
    const region = this.configService.get<string>('aws.region');
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
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
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, name: string) {
    const html = getWelcomeTemplate(name);
    await this.sendEmail(to, 'Welcome to Luuna!', html);
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const verificationUrl = `${this.configService.get<string>('auth.frontendVerificationUrl')}?token=${token}`;
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
