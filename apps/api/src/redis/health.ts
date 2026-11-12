import { redis } from './client.js';
import { logger } from '../utils/logger.js';

export interface RedisHealthResult {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

/**
 * Checks Redis connectivity via PING command with latency measurement.
 */
export const checkRedisHealth = async (): Promise<RedisHealthResult> => {
  const start = Date.now();
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    const pong = await redis.ping();
    const latencyMs = Date.now() - start;

    if (pong === 'PONG') {
      return {
        status: 'up',
        latencyMs,
      };
    }
    return {
      status: 'down',
      latencyMs,
      error: `Unexpected response: ${pong}`,
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const errorMessage = (error as Error).message;
    logger.warn(`Redis health check failed (${latencyMs}ms): ${errorMessage}`);
    return {
      status: 'down',
      latencyMs,
      error: 'Redis connection failed',
    };
  }
};
