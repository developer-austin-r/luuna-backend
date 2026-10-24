import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * This configuration is also used by `prisma migrate deploy` inside the
 * production image, where the TypeScript source directory is not present.
 */
function databaseUrl(databaseName: string): string {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'luuna_user';
  const password = process.env.DB_PASSWORD || 'luuna_pass';
  const schema = process.env.DB_SCHEMA || 'public';

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(databaseName)}?schema=${encodeURIComponent(schema)}`;
}

const databaseName = process.env.DB_NAME || 'luuna_db';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',

  },
  datasource: {
    url: process.env.DATABASE_URL || databaseUrl(databaseName),
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL || databaseUrl(`${databaseName}_shadow`),
  },
});
