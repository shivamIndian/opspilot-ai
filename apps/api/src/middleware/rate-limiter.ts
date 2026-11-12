import rateLimit, { type Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../redis/index.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const createRedisStore = (prefix: string) => {
  if (config.NODE_ENV === 'test') {
    return undefined; // In-memory store for isolated tests
  }

  try {
    return new RedisStore({
      // @ts-expect-error RedisStore sendCommand typing
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: `rl:${prefix}:`,
    });
  } catch (error) {
    logger.warn(
      `Failed to initialize Redis store for rate limit prefix '${prefix}'. Falling back to memory:`,
      (error as Error).message
    );
    return undefined;
  }
};

const createLimiter = (options: {
  prefix: string;
  windowMs: number;
  max: number;
  message: string;
}) => {
  const limiterOptions: Partial<Options> = {
    windowMs: options.windowMs,
    max: config.NODE_ENV === 'test' ? 1000 : options.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(options.prefix),
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message,
        },
      });
    },
  };

  return rateLimit(limiterOptions);
};

/**
 * Standard API rate limiter applied globally across public/protected endpoints.
 * 300 requests per 15 minutes in production.
 */
export const globalApiLimiter = createLimiter({
  prefix: 'api',
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'API request limit exceeded. Please try again after 15 minutes.',
});

/**
 * Rate limiter for computationally expensive AI operations (Chat messages, RAG questions, LangGraph runs, Evaluation).
 * 60 requests per 15 minutes in production.
 */
export const aiOperationsLimiter = createLimiter({
  prefix: 'ai_ops',
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'AI operations rate limit exceeded. Please pace your requests.',
});

/**
 * Rate limiter for file uploads to protect storage and processing worker pipelines.
 * 30 uploads per 15 minutes in production.
 */
export const fileUploadLimiter = createLimiter({
  prefix: 'uploads',
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'File upload rate limit exceeded. Please try again later.',
});
