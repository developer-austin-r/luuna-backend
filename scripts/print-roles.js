const dotenv = require('dotenv');
dotenv.config({ path: 'd:/lunna/lunna_ecom/lunna_backend/luuna-backend/.env' });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
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
    const roles = await prisma.role.findMany();
    console.log('Roles in DB:', roles);
  } catch (err) {
    console.error('Error fetching roles:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
