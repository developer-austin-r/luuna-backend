import {
  buildDatabaseUrl,
  buildShadowDatabaseUrl,
} from './config/database.config';

export default () => ({
  environment: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  database: {
    url: buildDatabaseUrl(),
    shadowUrl: buildShadowDatabaseUrl(),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || true,
  },
});
