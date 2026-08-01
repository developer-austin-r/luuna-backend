import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  // Individual database configuration variables
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SCHEMA: Joi.string().default('public'),
  CORS_ORIGIN: Joi.string().optional(),
  // AWS S3 configuration
  AWS_REGION: Joi.string().optional(),
  AWS_S3_BUCKET: Joi.string().optional(),
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  AWS_S3_BASE_URL: Joi.string().uri().optional(),
  // JWT / Auth configuration
  JWT_SECRET: Joi.string().optional(),
  JWT_REFRESH_SECRET: Joi.string().optional(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  AUTH_MAX_LOGIN_ATTEMPTS: Joi.number().integer().min(1).default(3),
  AUTH_LOCK_DURATION_MINUTES: Joi.number().integer().min(1).default(30),
  // Cookie configuration
  COOKIE_DOMAIN: Joi.string().allow('').optional(),
  COOKIE_SECURE: Joi.string().valid('true', 'false').default('false'),
  COOKIE_SAME_SITE: Joi.string().valid('Lax', 'Strict', 'None').default('Lax'),
});
