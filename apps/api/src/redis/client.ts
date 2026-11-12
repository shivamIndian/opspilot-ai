import { Redis } from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Mask credentials for secure logging
export const getSanitizedRedisUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***REDACTED***';
    }
    return parsed.toString();
  } catch {
    return 'redis://***REDACTED***';
  }
};

/**
 * Enterprise ioredis client configured for OpsPilot Core API.
 * Future-compatible with BullMQ queues and distributed session caching.
 */
export const redis = new Redis(config.REDIS_URL, {
  connectTimeout: config.REDIS_CONNECT_TIMEOUT_MS,
  maxRetriesPerRequest: null, // Required by BullMQ in future modules
  enableReadyCheck: true,
  lazyConnect: true, // Connect explicitly or on-demand
  retryStrategy(times) {
    // Exponential backoff with 2000ms max jitter
    const delay = Math.min(times * 200, 2000);
    logger.debug(`Redis reconnection attempt #${times} in ${delay}ms`);
    return delay;
  },
});

// Redis Event Listeners
redis.on('connect', () => {
  logger.info('Connected to Redis server');
});

redis.on('ready', () => {
  logger.info('Redis client is ready to accept commands');
});

redis.on('error', (err: Error) => {
  logger.warn('Redis client error:', err.message);
});

redis.on('close', () => {
  logger.debug('Redis client connection closed');
});

redis.on('reconnecting', (time: number) => {
  logger.debug(`Redis reconnecting in ${time}ms`);
});

/**
 * Gracefully disconnect Redis client during server shutdown.
 */
export const closeRedis = async (): Promise<void> => {
  logger.info('Disconnecting Redis client...');
  try {
    if (redis.status === 'ready' || redis.status === 'connecting') {
      await redis.quit();
    } else {
      redis.disconnect();
    }
    logger.info('Redis disconnected cleanly.');
  } catch (error) {
    logger.error('Error while disconnecting Redis:', (error as Error).message);
    redis.disconnect();
  }
};
