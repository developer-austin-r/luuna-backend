/**
 * Database configuration builder
 * Constructs DATABASE_URL from individual environment variables
 * This ensures Prisma receives the correctly formatted connection string
 */

export function buildDatabaseUrl(): string {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'luuna_db';
  const dbUser = process.env.DB_USER || 'luuna_user';
  const dbPassword = process.env.DB_PASSWORD || 'luuna_pass';
  const dbSchema = process.env.DB_SCHEMA || 'public';

  if (!dbUser || !dbPassword || !dbName) {
    throw new Error(
      'Missing required database environment variables: DB_USER, DB_PASSWORD, DB_NAME',
    );
  }

  return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=${dbSchema}`;
}

export function buildShadowDatabaseUrl(): string {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbUser = process.env.DB_USER || 'luuna_user';
  const dbPassword = process.env.DB_PASSWORD || 'luuna_pass';
  const dbSchema = process.env.DB_SCHEMA || 'public';

  if (!dbUser || !dbPassword) {
    throw new Error(
      'Missing required database environment variables: DB_USER, DB_PASSWORD',
    );
  }

  // Shadow database uses the same name with "_shadow" suffix
  const shadowDbName = `${process.env.DB_NAME || 'luuna_db'}_shadow`;
  return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${shadowDbName}?schema=${dbSchema}`;
}

/**
 * Initializes Prisma environment variables
 * Called before Prisma initialization to set up DATABASE_URL
 */
export function initializePrismaEnv(): void {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = buildDatabaseUrl();
  }
  if (!process.env.SHADOW_DATABASE_URL) {
    process.env.SHADOW_DATABASE_URL = buildShadowDatabaseUrl();
  }
}
