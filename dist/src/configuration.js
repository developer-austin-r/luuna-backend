"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_config_1 = require("./config/database.config");
exports.default = () => ({
    environment: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3000),
    database: {
        url: (0, database_config_1.buildDatabaseUrl)(),
        shadowUrl: (0, database_config_1.buildShadowDatabaseUrl)(),
    },
    cors: {
        origin: process.env.CORS_ORIGIN || true,
    },
});
//# sourceMappingURL=configuration.js.map