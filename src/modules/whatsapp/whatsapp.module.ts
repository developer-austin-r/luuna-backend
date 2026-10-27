import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [WhatsAppController, WhatsAppWebhookController],
  providers: [WhatsAppService, WhatsAppWebhookService],
  exports: [WhatsAppService], // exported so other modules (billing, orders) can inject it
})
export class WhatsAppModule {}
