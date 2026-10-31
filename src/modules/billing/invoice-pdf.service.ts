import { Injectable, Logger } from '@nestjs/common';
// pdfkit is a CommonJS module; use require() to avoid ESM/CJS interop issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export interface InvoiceLineItem {
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  total: number;
}

export interface InvoiceData {
  invoiceId: string;
  billNumber?: string;
  name?: string;
  whatsappNumber?: string;
  address?: string;
  paymentMethod?: string;
  discount: number;
  tax: number;
  total: number;
  subtotal: number;
  notes?: string;
  items: InvoiceLineItem[];
  createdAt: Date;
}

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  /** Generate a PDF invoice and return the raw Buffer. */
  async generatePdf(data: InvoiceData): Promise<Buffer> {
    this.logger.log(`Generating PDF for invoice ${data.invoiceId}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ──────────────────────────────────────────────────
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('LUUNA', 50, 50)
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Tax Invoice', 50, 78);

      // Invoice details (top right)
      const rightX = 400;
      doc
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Invoice ID:', rightX, 50)
        .font('Helvetica')
        .text(data.invoiceId.slice(0, 8).toUpperCase(), rightX + 80, 50);

      if (data.billNumber) {
        doc
          .font('Helvetica-Bold')
          .text('Bill No:', rightX, 65)
          .font('Helvetica')
          .text(data.billNumber, rightX + 80, 65);
      }

      doc
        .font('Helvetica-Bold')
        .text('Date:', rightX, 80)
        .font('Helvetica')
        .text(
          data.createdAt.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          rightX + 80,
          80,
        );

      // ── Divider ─────────────────────────────────────────────────
      doc
        .moveTo(50, 105)
        .lineTo(545, 105)
        .strokeColor('#dddddd')
        .lineWidth(1)
        .stroke();

      // ── Customer Details ─────────────────────────────────────────
      let yPos = 120;
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9).text('BILL TO', 50, yPos);
      yPos += 14;

      if (data.name) {
        doc.font('Helvetica').fontSize(10).text(data.name, 50, yPos);
        yPos += 14;
      }
      if (data.whatsappNumber) {
        doc
          .fillColor('#555555')
          .fontSize(9)
          .text(`WhatsApp: ${data.whatsappNumber}`, 50, yPos);
        yPos += 12;
      }
      if (data.address) {
        doc.fillColor('#555555').fontSize(9).text(data.address, 50, yPos, { width: 220 });
        yPos += doc.heightOfString(data.address, { width: 220 }) + 4;
      }
      if (data.paymentMethod) {
        doc
          .fillColor('#555555')
          .fontSize(9)
          .text(`Payment: ${data.paymentMethod}`, 50, yPos);
        yPos += 12;
      }

      // ── Items Table ──────────────────────────────────────────────
      const tableTop = Math.max(yPos + 10, 190);
      const col = { item: 50, qty: 280, price: 340, disc: 400, total: 470 };

      // Table header background
      doc.rect(50, tableTop, 495, 18).fillColor('#f0f0f0').fill();

      doc
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('ITEM', col.item, tableTop + 5)
        .text('QTY', col.qty, tableTop + 5)
        .text('UNIT PRICE', col.price, tableTop + 5)
        .text('DISCOUNT', col.disc, tableTop + 5)
        .text('TOTAL', col.total, tableTop + 5);

      let rowY = tableTop + 22;
      doc.font('Helvetica').fontSize(9);

      for (const item of data.items) {
        const rowHeight = 18;

        // Alternate row shading
        if (data.items.indexOf(item) % 2 === 1) {
          doc.rect(50, rowY - 2, 495, rowHeight).fillColor('#fafafa').fill();
        }

        doc
          .fillColor('#000000')
          .text(
            item.sku ? `${item.productName} (${item.sku})` : item.productName,
            col.item,
            rowY,
            { width: 220 },
          )
          .text(String(item.quantity), col.qty, rowY)
          .text(`₹${Number(item.unitPrice).toFixed(2)}`, col.price, rowY)
          .text(
            item.discount ? `₹${Number(item.discount).toFixed(2)}` : '-',
            col.disc,
            rowY,
          )
          .text(`₹${Number(item.total).toFixed(2)}`, col.total, rowY);

        rowY += rowHeight;
      }

      // Table bottom line
      doc
        .moveTo(50, rowY + 2)
        .lineTo(545, rowY + 2)
        .strokeColor('#dddddd')
        .lineWidth(0.5)
        .stroke();

      // ── Totals ───────────────────────────────────────────────────
      let totalY = rowY + 14;
      const labelX = 380;
      const valueX = 470;

      const addTotalRow = (label: string, value: string, bold = false) => {
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .fillColor('#333333')
          .text(label, labelX, totalY)
          .text(value, valueX, totalY);
        totalY += 14;
      };

      addTotalRow('Subtotal:', `₹${Number(data.subtotal).toFixed(2)}`);
      if (data.discount > 0) {
        addTotalRow('Discount:', `-₹${Number(data.discount).toFixed(2)}`);
      }
      if (data.tax > 0) {
        addTotalRow('Tax:', `₹${Number(data.tax).toFixed(2)}`);
      }

      // Bold total divider
      doc
        .moveTo(labelX, totalY)
        .lineTo(545, totalY)
        .strokeColor('#aaaaaa')
        .lineWidth(0.5)
        .stroke();
      totalY += 4;

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#000000')
        .text('TOTAL:', labelX, totalY)
        .text(`₹${Number(data.total).toFixed(2)}`, valueX, totalY);

      // ── Notes ────────────────────────────────────────────────────
      if (data.notes) {
        totalY += 30;
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor('#333333')
          .text('Notes:', 50, totalY);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#555555')
          .text(data.notes, 50, totalY + 12, { width: 400 });
      }

      // ── Footer ───────────────────────────────────────────────────
      doc
        .fontSize(8)
        .fillColor('#aaaaaa')
        .text('Thank you for your business!', 50, 760, {
          align: 'center',
          width: 495,
        });

      doc.end();
    });
  }
}
