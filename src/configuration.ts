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
  aws: {
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_S3_BUCKET,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3BaseUrl: process.env.AWS_S3_BASE_URL,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'changeme-jwt-secret',
    jwtRefreshSecret:
      process.env.JWT_REFRESH_SECRET || 'changeme-jwt-refresh-secret',
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    maxLoginAttempts: Number(process.env.AUTH_MAX_LOGIN_ATTEMPTS ?? 3),
    lockDurationMinutes: Number(process.env.AUTH_LOCK_DURATION_MINUTES ?? 30),
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    cookieSameSite:
      (process.env.COOKIE_SAME_SITE as 'Lax' | 'Strict' | 'None') || 'Lax',
  },
});
