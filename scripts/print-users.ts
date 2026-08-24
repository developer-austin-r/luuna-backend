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
  const users = await prisma.user.findMany({
    include: { role: true },
  });
  console.log('--- USERS IN DATABASE ---');
  console.log(users.map(u => ({ id: u.id, email: u.email, role: u.role?.name, status: u.status })));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
