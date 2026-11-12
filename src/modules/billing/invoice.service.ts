import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { InvoicePdfService, InvoiceData } from './invoice-pdf.service';
import { Prisma } from '@prisma/client';

export interface CreateInvoiceDto {
  name?: string;
  whatsappNumber?: string;
  address?: string;
  paymentMethodId?: string;
  paymentMethodLabel?: string; // human-readable label for PDF
  discount?: number;
  tax?: number;
  total: number;
  subtotal: number;
  notes?: string;
  billNumber?: string;
  items: Array<{
    productName: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
    total: number;
  }>;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pdfService: InvoicePdfService,
  ) {}

  /**
   * Full invoice lifecycle:
   *  1. Create DB record (without path) → get UUID
   *  2. Generate PDF buffer
   *  3. Upload PDF to S3 at billing_invoice/{id}/invoice.pdf
   *  4. Update DB record with invoice_path
   *  5. Return the full record + signed URL
   */
  async create(dto: CreateInvoiceDto) {
    const discount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;

    // ── 1. Create DB record without path ──────────────────────────
    const invoice = await this.prisma.billingInvoice.create({
      data: {
        name: dto.name ?? null,
        whatsappNumber: dto.whatsappNumber ?? null,
        address: dto.address ?? null,
        paymentMethodId: dto.paymentMethodId ?? null,
        discount: new Prisma.Decimal(discount),
        tax: new Prisma.Decimal(tax),
        total: new Prisma.Decimal(dto.total),
        notes: dto.notes ?? null,
        invoicePath: null,
      },
      include: {
        paymentMethod: true,
      },
    });

    // ── 2. Generate PDF ───────────────────────────────────────────
    const pdfData: InvoiceData = {
      invoiceId: invoice.id,
      billNumber: dto.billNumber,
      name: dto.name,
      whatsappNumber: dto.whatsappNumber,
      address: dto.address,
      paymentMethod: dto.paymentMethodLabel ?? invoice.paymentMethod?.value,
      discount,
      tax,
      total: dto.total,
      subtotal: dto.subtotal,
      notes: dto.notes,
      items: dto.items,
      createdAt: invoice.createdAt,
    };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.pdfService.generatePdf(pdfData);
    } catch (err) {
      // Clean up the DB record if PDF generation fails
      await this.prisma.billingInvoice.delete({ where: { id: invoice.id } });
      this.logger.error('PDF generation failed', err);
      throw new InternalServerErrorException('Failed to generate invoice PDF');
    }

    // ── 3. Upload to S3 ──────────────────────────────────────────
    const s3Key = `billing_invoice/${invoice.id}/invoice.pdf`;
    try {
      await this.storage.uploadFile({
        key: s3Key,
        buffer: pdfBuffer,
        mimeType: 'application/pdf',
        cacheControl: 'no-cache',
      });
    } catch (err) {
      await this.prisma.billingInvoice.delete({ where: { id: invoice.id } });
      this.logger.error('S3 upload failed', err);
      throw new InternalServerErrorException(
        'Failed to upload invoice to storage',
      );
    }

    // ── 4. Update DB record with path ─────────────────────────────
    const updated = await this.prisma.billingInvoice.update({
      where: { id: invoice.id },
      data: { invoicePath: s3Key },
      include: { paymentMethod: true },
    });

    // ── 5. Build public URL and return ───────────────────────────
    const invoiceUrl = this.storage.generatePublicUrl(s3Key);

    this.logger.log(`Invoice created — id: ${invoice.id}, s3: ${s3Key}`);

    return {
      ...updated,
      invoiceUrl,
    };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.billingInvoice.findUnique({
      where: { id },
      include: { paymentMethod: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice "${id}" not found`);
    }
    const invoiceUrl = invoice.invoicePath
      ? this.storage.generatePublicUrl(invoice.invoicePath)
      : null;
    return { ...invoice, invoiceUrl };
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.billingInvoice.count(),
      this.prisma.billingInvoice.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { paymentMethod: true },
      }),
    ]);
    return {
      data: data.map((inv) => ({
        ...inv,
        invoiceUrl: inv.invoicePath
          ? this.storage.generatePublicUrl(inv.invoicePath)
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listPaymentMethods() {
    return this.prisma.paymentMethodOption.findMany({
      orderBy: { value: 'asc' },
    });
  }
}
