import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { buildDatabaseUrl, buildShadowDatabaseUrl } from './src/config/database.config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: buildDatabaseUrl(),
    shadowDatabaseUrl: buildShadowDatabaseUrl(),
  },
});

