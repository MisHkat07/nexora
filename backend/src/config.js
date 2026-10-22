require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const Joi = require('joi');

const isProduction = process.env.NODE_ENV === 'production';

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(8888),
  DATABASE: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }),
  JWT_SECRET: isProduction ? Joi.string().min(32).required() : Joi.string().required(),
  // Comma-separated list of origins allowed to call the API from a browser
  CORS_ORIGINS: Joi.string().allow(''),
  // Number of reverse proxies in front of the app (Render = 1)
  TRUST_PROXY: Joi.number().integer().min(0).default(isProduction ? 1 : 0),
  FRONTEND_DIST: Joi.string(),
  RESEND_API: Joi.string().allow(''),
  // Where uploaded files live: local disk (dev) or any S3-compatible bucket (AWS S3, R2, Spaces, MinIO)
  STORAGE_DRIVER: Joi.string().valid('local', 's3').default('local'),
  S3_BUCKET: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required() }),
  S3_ACCESS_KEY_ID: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required() }),
  S3_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required() }),
  S3_REGION: Joi.string().default('auto'),
  // Needed for non-AWS providers, e.g. https://<account>.r2.cloudflarestorage.com
  S3_ENDPOINT: Joi.string().uri({ scheme: ['http', 'https'] }),
  S3_FORCE_PATH_STYLE: Joi.boolean().default(false),
  UPLOAD_MAX_BYTES: Joi.number().integer().min(1024).default(5 * 1024 * 1024),
}).unknown(true);

// Treat `KEY=` lines in .env as unset
const rawEnv = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ''));

const { error, value: env } = schema.validate(rawEnv, { abortEarly: false });

if (error) {
  const problems = error.details.map((detail) => `  - ${detail.message}`).join('\n');
  console.error(`Invalid environment configuration (see backend/.env.example):\n${problems}`);
  process.exit(1);
}

const defaultCorsOrigins = env.NODE_ENV === 'production' ? [] : ['http://localhost:3000'];

module.exports = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  port: env.PORT,
  database: env.DATABASE,
  jwtSecret: env.JWT_SECRET,
  corsOrigins: env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map((origin) => origin.trim().replace(/\/$/, ''))
    : defaultCorsOrigins,
  trustProxy: env.TRUST_PROXY,
  frontendDist: env.FRONTEND_DIST,
  storage: {
    driver: env.STORAGE_DRIVER,
    maxUploadBytes: env.UPLOAD_MAX_BYTES,
    s3: {
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  },
};
