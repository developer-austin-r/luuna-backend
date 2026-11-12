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
  // WhatsApp Cloud API credentials are checked when sending, not at startup.
  WHATSAPP_ACCESS_TOKEN: Joi.string().allow('').optional(),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().pattern(/^\d+$/).allow('').optional(),
  WHATSAPP_API_VERSION: Joi.string()
    .pattern(/^v\d+\.\d+$/)
    .default('v25.0'),
  WHATSAPP_TEMPLATE_NAME: Joi.string()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .default('jaspers_market_order_confirmation_v1'),
  WHATSAPP_TEMPLATE_LANGUAGE: Joi.string()
    .pattern(/^[a-z]{2}_[A-Z]{2}$/)
    .default('en_US'),
  // Webhook verify token — set this to a long random secret you choose
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: Joi.string().allow('').optional(),
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
