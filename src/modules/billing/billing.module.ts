import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController, InvoiceController],
  providers: [BillingService, InvoiceService, InvoicePdfService],
  exports: [BillingService, InvoiceService],
})
export class BillingModule {}
