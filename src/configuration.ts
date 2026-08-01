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
});
