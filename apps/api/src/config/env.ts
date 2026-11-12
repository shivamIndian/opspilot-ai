import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env variables into process.env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive().max(65535))
    .default('4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),

  // PostgreSQL Database Configuration
  DATABASE_URL: z
    .string()
    .min(1)
    .default(
      'postgresql://opspilot_api:change_this_api_password@localhost:5432/opspilot_db?schema=app'
    ),
  DATABASE_POOL_MAX: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('20'),
  DATABASE_IDLE_TIMEOUT_MS: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('30000'),
  DATABASE_CONNECTION_TIMEOUT_MS: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('5000'),

  // Redis Configuration
  REDIS_URL: z.string().min(1).default('redis://:change_this_redis_password@localhost:6379/0'),
  REDIS_CONNECT_TIMEOUT_MS: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('5000'),

  // Authentication & JWT Configuration
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters')
    .default('opspilot_dev_jwt_access_secret_key_minimum_32_characters_long!'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_ISSUER: z.string().default('opspilot-api'),
  JWT_AUDIENCE: z.string().default('opspilot-client'),

  // Refresh Token & Session Management
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  REFRESH_COOKIE_NAME: z.string().default('opspilot_refresh_token'),
  REFRESH_COOKIE_SECURE: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
  REFRESH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  REFRESH_COOKIE_DOMAIN: z.string().optional(),

  // CSRF Protection
  CSRF_COOKIE_NAME: z.string().default('opspilot_csrf_token'),
  CSRF_HEADER_NAME: z.string().default('x-csrf-token'),

  // Token Expiration Windows
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('30'),
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('24'),

  // Email Delivery Integration
  MAIL_PROVIDER: z.enum(['development', 'smtp']).default('development'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .transform(val => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().positive().max(65535).optional())
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('OpsPilot AI <noreply@opspilot.internal>'),

  // Document Storage Configuration
  DOCUMENT_STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  DOCUMENT_STORAGE_ROOT: z.string().default('.data/opspilot-uploads'),
  MAX_DOCUMENT_SIZE_MB: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('25'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_DOCUMENT_BUCKET: z.string().optional().default(''),

  // Internal AI Service & Processing Queue Configuration
  AI_SERVICE_INTERNAL_TOKEN: z
    .string()
    .default('opspilot_internal_service_token_dev_secret_32char!'),
  DOCUMENT_PROCESSING_QUEUE: z.string().default('opspilot-document-processing'),
  DOCUMENT_PROCESSING_CONCURRENCY: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('2'),
  DOCUMENT_PROCESSING_ATTEMPTS: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('3'),

  // Document Embedding Queue & Provider Configuration
  EMBEDDING_PROVIDER: z.string().default('openai'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('1536'),
  DOCUMENT_EMBEDDING_QUEUE: z.string().default('opspilot-document-embeddings'),
  DOCUMENT_EMBEDDING_CONCURRENCY: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('3'),
  DOCUMENT_EMBEDDING_ATTEMPTS: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('3'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
};

export const config = parseEnv();
export const env = config;
export type Config = z.infer<typeof envSchema>;
