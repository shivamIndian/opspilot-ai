import rateLimit, { type Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../../../redis/index.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

const createStore = () => {
  // If in test mode or Redis is unavailable, memory store is preferable
  if (config.NODE_ENV === 'test' || redis.status !== 'ready') {
    return undefined;
  }

  try {
    return new RedisStore({
      sendCommand: async (...args: string[]) => {
        if (redis.status !== 'ready') return undefined;
        try {
          return await (redis as any).call(...args);
        } catch {
          return undefined;
        }
      },
      prefix: 'rl:auth:',
    });
  } catch (error) {
    logger.warn(
      'Failed to initialize Redis store for rate limiting. Falling back to in-memory store:',
      (error as Error).message
    );
    return undefined;
  }
};

const standardLimiterOptions: Partial<Options> = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'test' ? 1000 : 15, // limit requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again after 15 minutes.',
      },
    });
  },
};

export const authRateLimiter = rateLimit({
  ...standardLimiterOptions,
  store: createStore(),
});

export const refreshRateLimiter = rateLimit({
  ...standardLimiterOptions,
  max: config.NODE_ENV === 'test' ? 1000 : 60,
  store: createStore(),
});
