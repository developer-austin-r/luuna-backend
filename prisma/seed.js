const dotenv = require('dotenv');
dotenv.config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const DB_USER = process.env.DB_USER || 'luuna_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'luuna_pass';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.DB_NAME || 'luuna_db';
const DB_SCHEMA = process.env.DB_SCHEMA || 'public';

const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}`;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database tables...');
  
  // Clear category assignments and categories
  await prisma.productCategory.deleteMany({});
  await prisma.category.deleteMany({});
  
  console.log('Seeding database with default brand...');

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
