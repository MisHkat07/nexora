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
  PUBLIC_SERVER_FILE: Joi.string().allow(''),
  RESEND_API: Joi.string().allow(''),
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
};
