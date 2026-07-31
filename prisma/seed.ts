import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

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

async function main() {
  console.log('Seeding database with default statuses, categories and brands...');

  // Create Statuses
  await prisma.status.deleteMany({});
  const statuses = [
    { id: '11111111-1111-4111-a111-111111111111', status: 'Active', slug: 'active' },
    { id: '22222222-2222-4222-a222-222222222222', status: 'Inactive', slug: 'inactive' },
    { id: '33333333-3333-4333-a333-333333333333', status: 'Archive', slug: 'archive' },
  ];

  for (const s of statuses) {
    const upserted = await prisma.status.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
    console.log('Upserted Status:', upserted.status);
  }

  // Create Brand
  const brand = await prisma.brand.upsert({
    where: { id: 'b75f8dbd-0df0-4b21-863a-bbce86207865' },
    update: {},
    create: {
      id: 'b75f8dbd-0df0-4b21-863a-bbce86207865',
      name: 'Luuna Luxury',
      logo: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=100&q=80',
      status: true,
    },
  });
  console.log('Upserted Brand:', brand.name);

  // Define categories to seed
  const categories = [
    {
      id: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
      name: 'Apparel',
      slug: 'apparel',
      description: 'Stylish shirts, dresses, trousers and outerwear.',
      status: true,
    },
    {
      id: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
      name: 'Bags',
      slug: 'bags',
      description: 'Handcrafted leather totes, wallets, and daily backpacks.',
      status: true,
    },
    {
      id: 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
      name: 'Jewelry',
      slug: 'jewelry',
      description: 'High-quality gold, sterling silver, and precious stones.',
      status: true,
    },
    {
      id: 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
      name: 'Shoes',
      slug: 'shoes',
      description: 'From casual sneakers to formal leather dress shoes and boots.',
      status: true,
    },
    {
      id: 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5',
      name: 'Accessories',
      slug: 'accessories',
      description: 'Scarves, belts, sunglasses and small tech items.',
      status: true,
    },
  ];

  for (const cat of categories) {
    const upserted = await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
    console.log('Upserted Category:', upserted.name);
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
