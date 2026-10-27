import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import type { MetaWebhookPayload } from './dto';

/**
 * Handles the Meta WhatsApp Cloud API webhook.
 *
 * Routes (all under /whatsapp/webhook):
 *  GET  — subscription verification challenge (called once by Meta)
 *  POST — delivery status updates & inbound customer messages
 *
 * IMPORTANT: These endpoints MUST NOT be behind authentication guards,
 * because Meta's servers call them without any bearer token. The POST
 * endpoint is protected by checking the `X-Hub-Signature-256` header
 * (payload HMAC) in production, and the GET endpoint validates the
 * verify token.
 */
@ApiTags('WhatsApp Webhook')
@Controller('whatsapp/webhook')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(private readonly webhookService: WhatsAppWebhookService) {}

  /**
   * Meta's subscription verification handshake.
   *
   * Meta sends a GET request with:
   *   ?hub.mode=subscribe
   *   &hub.verify_token=<your_token>
   *   &hub.challenge=<random_string>
   *
   * We must respond with the challenge string in plain text and HTTP 200.
   */
  @Get()
  @ApiOperation({ summary: 'Meta WhatsApp webhook verification (GET challenge)' })
  @ApiOkResponse({ description: 'Returns hub.challenge on success.' })
  @ApiQuery({ name: 'hub.mode', required: false })
  @ApiQuery({ name: 'hub.verify_token', required: false })
  @ApiQuery({ name: 'hub.challenge', required: false })
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
    @Res() res?: Response,
  ): void {
    const result = this.webhookService.verifySubscription(mode, token, challenge);

    if (!result) {
      throw new ForbiddenException('Webhook verification failed');
    }

    // Respond with plain-text challenge as required by Meta.
    res!.status(HttpStatus.OK).send(result);
  }

  /**
   * Receives inbound webhook events from Meta (message statuses, inbound messages, etc.).
   *
   * Meta expects HTTP 200 within 20 seconds; any non-2xx or timeout causes a retry.
   * We always respond 200 immediately and process asynchronously within the same
   * request lifecycle (NestJS handles the async gracefully for short tasks).
   *
   * Payload structure: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive WhatsApp webhook events from Meta (POST)' })
  @ApiExcludeEndpoint() // Hide raw webhook from Swagger UI to reduce noise
  async receive(@Body() body: unknown): Promise<{ status: string }> {
    // Basic structural check — Meta always sends { object, entry: [...] }
    if (
      !body ||
      typeof body !== 'object' ||
      !('object' in body) ||
      !('entry' in body)
    ) {
      this.logger.warn('Received malformed webhook payload — ignoring.');
      throw new BadRequestException('Invalid webhook payload structure');
    }

    const payload = body as MetaWebhookPayload;
    this.logger.debug(
      `Webhook received: object=${payload.object}, entries=${payload.entry?.length ?? 0}`,
    );

    // Process asynchronously — errors are caught inside processPayload so
    // we always return 200 to Meta (prevents infinite retries on logic errors).
    await this.webhookService.processPayload(payload);

    return { status: 'ok' };
  }
}
