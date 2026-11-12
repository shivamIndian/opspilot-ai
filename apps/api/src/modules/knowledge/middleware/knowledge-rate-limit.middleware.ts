import rateLimit, { type Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../../../redis/index.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

const createStore = () => {
  if (config.NODE_ENV === 'test') {
    return undefined;
  }

  try {
    return new RedisStore({
      // @ts-expect-error RedisStore sendCommand typing
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: 'rl:knowledge:answer:',
    });
  } catch (error) {
    logger.warn(
      'Failed to initialize Redis store for knowledge answer rate limiting. Falling back to memory:',
      (error as Error).message
    );
    return undefined;
  }
};

const answerLimiterOptions: Partial<Options> = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'test' ? 1000 : 30, // 30 answer requests per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message:
          'Knowledge answer rate limit exceeded. Please wait a few minutes before trying again.',
      },
    });
  },
};

export const knowledgeAnswerRateLimiter = rateLimit({
  ...answerLimiterOptions,
  store: createStore(),
});
