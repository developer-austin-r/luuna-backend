/**
 * Environment loader for Prisma CLI
 * This script is executed before Prisma commands to set up DATABASE_URL
 * It's used as a preload script in npm commands
 */
import 'dotenv/config';
import { buildDatabaseUrl, buildShadowDatabaseUrl } from './database.config';

// Set DATABASE_URL before Prisma initialization
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = buildDatabaseUrl();
}

if (!process.env.SHADOW_DATABASE_URL) {
  process.env.SHADOW_DATABASE_URL = buildShadowDatabaseUrl();
}
