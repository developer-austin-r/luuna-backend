import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { seedBrands } from './seeders/brands.seed';
import { seedCategories } from './seeders/categories.seed';
import { seedStatuses } from './seeders/statuses.seed';
import { seedRoles } from './seeders/roles.seed';
import { seedModulesAndActions } from './seeders/activity-log.seed';
import { seedPermissions } from './seeders/permissions.seed';
import { seedRolePermissions } from './seeders/role-permissions.seed';
import { seedMenus } from './seeders/menus.seed';

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
  console.log('\n🌱 Seeding database...\n');

  // ── Core data ──────────────────────────────────────────────────
  console.log('── Roles');
  await seedRoles(prisma);

  console.log('── Statuses');
  await seedStatuses(prisma);

  console.log('── Brands');
  await seedBrands(prisma);

  console.log('── Categories');
  await seedCategories(prisma);

  console.log('── Activity Log Modules & Actions');
  await seedModulesAndActions(prisma);

  // ── RBAC ───────────────────────────────────────────────────────
  console.log('\n── Permissions');
  await seedPermissions(prisma);

  console.log('\n── Role → Permissions');
  await seedRolePermissions(prisma);

  console.log('\n── Menus');
  await seedMenus(prisma);

  console.log('\n✅ Seeding finished successfully.\n');
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
