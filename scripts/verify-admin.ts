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
  const updated = await prisma.user.update({
    where: { email: 'admin@example.com' },
    data: { isVerified: true },
  });
  console.log('✅ Admin user verified status set to true:', updated.email, 'isVerified:', updated.isVerified);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
