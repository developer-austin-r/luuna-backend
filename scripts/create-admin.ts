/**
 * Admin User Creation CLI Script
 *
 * Usage:
 *   npm run create:admin -- --email=admin@example.com --password=Password@123
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hash } from 'bcryptjs';

// ---------------------------------------------------------------------------
// Argument Parsing
// ---------------------------------------------------------------------------

function parseArgs(): { email: string; password: string } {
  const args = process.argv.slice(2);
  const argMap: Record<string, string> = {};

  for (const arg of args) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      argMap[match[1]] = match[2];
    }
  }

  if (!argMap.email || !argMap.password) {
    console.error(
      '\n❌  Usage: npm run create:admin -- --email=admin@example.com --password=Password@123\n',
    );
    process.exit(1);
  }

  return { email: argMap.email, password: argMap.password };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error(`\n❌  Invalid email format: "${email}"\n`);
    process.exit(1);
  }
}

function validatePassword(password: string): void {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('At least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('At least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('At least one special character');
  }

  if (errors.length > 0) {
    console.error('\n❌  Password does not meet requirements:');
    errors.forEach((e) => console.error(`   • ${e}`));
    console.error('');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { email, password } = parseArgs();

  console.log('\n🔐  Luuna Admin User Creator\n');

  validateEmail(email);
  validatePassword(password);

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
    // Check for duplicate email.
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.error(`\n❌  A user with email "${email}" already exists.\n`);
      process.exit(1);
    }

    // Fetch Admin role.
    const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
    if (!adminRole) {
      console.error(
        '\n❌  Admin role not found. Please run the seeder first:\n   npm run prisma:seed\n',
      );
      process.exit(1);
    }

    // Hash password.
    const hashedPassword = await hash(password, 12);

    // Create admin user.
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        roleId: adminRole.id,
      },
      select: {
        id: true,
        email: true,
        role: { select: { name: true } },
        createdAt: true,
      },
    });

    console.log('✅  Admin user created successfully!\n');
    console.log(`   ID:    ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role:  ${user.role?.name ?? 'Unknown'}`);
    console.log(`   Date:  ${user.createdAt.toISOString()}\n`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('\n❌  Unexpected error:', err);
  process.exit(1);
});
