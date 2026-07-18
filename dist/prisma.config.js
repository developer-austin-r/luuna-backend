"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("prisma/config");
const database_config_1 = require("./src/config/database.config");
exports.default = (0, config_1.defineConfig)({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: (0, database_config_1.buildDatabaseUrl)(),
        shadowDatabaseUrl: (0, database_config_1.buildShadowDatabaseUrl)(),
    },
});
//# sourceMappingURL=prisma.config.js.map