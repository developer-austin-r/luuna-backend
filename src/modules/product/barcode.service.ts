import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bwipjs from 'bwip-js';

@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to calculate the EAN-13 checksum digit.
   * Odd positions (1st, 3rd, 5th, etc.) are multiplied by 1.
   * Even positions (2nd, 4th, 6th, etc.) are multiplied by 3.
   */
  calculateEan13Checksum(digits12: string): number {
    if (digits12.length !== 12 || !/^\d+$/.test(digits12)) {
      throw new BadRequestException('EAN-13 checksum calculation requires exactly 12 digits');
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(digits12[i], 10);
      // odd position (1-indexed: 1st, 3rd...) -> index is even (0, 2...) -> multiplier 1
      // even position (1-indexed: 2nd, 4th...) -> index is odd (1, 3...) -> multiplier 3
      const multiplier = i % 2 === 0 ? 1 : 3;
      sum += digit * multiplier;
    }

    const remainder = sum % 10;
    return (10 - remainder) % 10;
  }

  /**
   * Generates a new unique EAN-13 barcode.
   * Formatted as: 200 (in-store prefix) + 9 random digits + 1 checksum digit.
   */
  async generateUniqueBarcodeValue(): Promise<string> {
    const prefix = '200';
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      attempts++;
      
      // Generate 9 random digits
      let randomDigits = '';
      for (let i = 0; i < 9; i++) {
        randomDigits += Math.floor(Math.random() * 10).toString();
      }

      const digits12 = prefix + randomDigits;
      const checksum = this.calculateEan13Checksum(digits12);
      const fullBarcode = digits12 + checksum.toString();

      // Verify uniqueness in database
      const existing = await this.prisma.product.findUnique({
        where: { barcode: fullBarcode },
      });

      if (!existing) {
        return fullBarcode;
      }
    }

    throw new BadRequestException('Failed to generate a unique barcode value after multiple attempts');
  }

  /**
   * Dynamically generates a barcode image buffer (PNG) for a given barcode value.
   * Supports standard EAN-13 format, and falls back to Code 128 if the text is alphanumeric.
   */
  async generateBarcodeImage(barcodeText: string): Promise<Buffer> {
    if (!barcodeText || barcodeText.trim().length === 0) {
      throw new BadRequestException('Barcode text cannot be empty');
    }

    // Determine the barcode format: EAN-13 if exactly 13 digits, otherwise Code 128
    const isEan13 = /^\d{13}$/.test(barcodeText);
    const bcid = isEan13 ? 'ean13' : 'code128';

    try {
      const pngBuffer = await bwipjs.toBuffer({
        bcid,
        text: barcodeText,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });
      return pngBuffer;
    } catch (err) {
      this.logger.error(
        `Failed to generate barcode image for text "${barcodeText}" using format "${bcid}"`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new BadRequestException(`Failed to generate barcode image: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
