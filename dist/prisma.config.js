"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("prisma/config");
function databaseUrl(databaseName) {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const user = process.env.DB_USER || 'luuna_user';
    const password = process.env.DB_PASSWORD || 'luuna_pass';
    const schema = process.env.DB_SCHEMA || 'public';
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(databaseName)}?schema=${encodeURIComponent(schema)}`;
}
const databaseName = process.env.DB_NAME || 'luuna_db';
exports.default = (0, config_1.defineConfig)({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: process.env.DATABASE_URL || databaseUrl(databaseName),
        shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || databaseUrl(`${databaseName}_shadow`),
    },
});
//# sourceMappingURL=prisma.config.js.map