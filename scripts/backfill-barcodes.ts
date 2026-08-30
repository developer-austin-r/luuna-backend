/**
 * Existing Products Barcode Backfill Script
 *
 * Usage:
 *   npm run backfill:barcodes
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function calculateEan13Checksum(digits12: string): number {
  if (digits12.length !== 12 || !/^\d+$/.test(digits12)) {
    throw new Error('EAN-13 checksum calculation requires exactly 12 digits');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits12[i], 10);
    const multiplier = i % 2 === 0 ? 1 : 3;
    sum += digit * multiplier;
  }

  const remainder = sum % 10;
  return (10 - remainder) % 10;
}

async function generateUniqueBarcodeValue(prisma: PrismaClient): Promise<string> {
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
    const checksum = calculateEan13Checksum(digits12);
    const fullBarcode = digits12 + checksum.toString();

    // Verify uniqueness in database
    const existing = await prisma.product.findUnique({
      where: { barcode: fullBarcode },
    });

    if (!existing) {
      return fullBarcode;
    }
  }

  throw new Error('Failed to generate a unique barcode value after multiple attempts');
}

async function main() {
  console.log('\n📦  Luuna Product Barcode Backfill Script\n');

  const DB_USER = process.env.DB_USER || 'luuna_user';
  const DB_PASSWORD = process.env.DB_PASSWORD || 'luuna_pass';
  const DB_HOST = process.env.DB_HOST || '127.0.0.1';
  const DB_PORT = process.env.DB_PORT || '5432';
  const DB_NAME = process.env.DB_NAME || 'luuna_db';
  const DB_SCHEMA = process.env.DB_SCHEMA || 'public';

  const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}`;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Fetch products where barcode is missing or empty
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { barcode: null },
          { barcode: '' },
        ],
      },
      select: {
        id: true,
        sku: true,
        name: true,
      },
    });

    if (products.length === 0) {
      console.log('✅  No products found with missing barcodes. Everything is up to date.');
      return;
    }

    console.log(`🔍  Found ${products.length} product(s) with missing barcodes. Starting backfill...`);

    let successCount = 0;
    for (const product of products) {
      try {
        const barcodeValue = await generateUniqueBarcodeValue(prisma);
        
        await prisma.product.update({
          where: { id: product.id },
          data: { barcode: barcodeValue },
        });

        console.log(`   ✓ [${product.sku}] ${product.name} → ${barcodeValue}`);
        successCount++;
      } catch (productErr) {
        console.error(`   ✗ Failed to generate barcode for product [${product.sku}] ${product.name}:`, productErr);
      }
    }

    console.log(`\n🎉  Backfill complete. Successfully updated ${successCount}/${products.length} product(s).\n`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('\n❌  Unexpected error in backfill script:', err);
  process.exit(1);
});
