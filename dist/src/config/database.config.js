"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDatabaseUrl = buildDatabaseUrl;
exports.buildShadowDatabaseUrl = buildShadowDatabaseUrl;
exports.initializePrismaEnv = initializePrismaEnv;
function buildDatabaseUrl() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'luuna_db';
    const dbUser = process.env.DB_USER || 'luuna_user';
    const dbPassword = process.env.DB_PASSWORD || 'luuna_pass';
    const dbSchema = process.env.DB_SCHEMA || 'public';
    if (!dbUser || !dbPassword || !dbName) {
        throw new Error('Missing required database environment variables: DB_USER, DB_PASSWORD, DB_NAME');
    }
    return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=${dbSchema}`;
}
function buildShadowDatabaseUrl() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbUser = process.env.DB_USER || 'luuna_user';
    const dbPassword = process.env.DB_PASSWORD || 'luuna_pass';
    const dbSchema = process.env.DB_SCHEMA || 'public';
    if (!dbUser || !dbPassword) {
        throw new Error('Missing required database environment variables: DB_USER, DB_PASSWORD');
    }
    const shadowDbName = `${process.env.DB_NAME || 'luuna_db'}_shadow`;
    return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${shadowDbName}?schema=${dbSchema}`;
}
function initializePrismaEnv() {
    if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = buildDatabaseUrl();
    }
    if (!process.env.SHADOW_DATABASE_URL) {
        process.env.SHADOW_DATABASE_URL = buildShadowDatabaseUrl();
    }
}
//# sourceMappingURL=database.config.js.map