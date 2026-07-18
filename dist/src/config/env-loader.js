"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const database_config_1 = require("./database.config");
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = (0, database_config_1.buildDatabaseUrl)();
}
if (!process.env.SHADOW_DATABASE_URL) {
    process.env.SHADOW_DATABASE_URL = (0, database_config_1.buildShadowDatabaseUrl)();
}
//# sourceMappingURL=env-loader.js.map