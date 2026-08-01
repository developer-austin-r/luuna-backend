import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { seedBrands } from './seeders/brands.seed';
import { seedCategories } from './seeders/categories.seed';
import { seedStatuses } from './seeders/statuses.seed';

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

  await seedStatuses(prisma);
  await seedBrands(prisma);
  await seedCategories(prisma);

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
