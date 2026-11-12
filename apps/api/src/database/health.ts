import { pool } from './connection.js';
import { logger } from '../utils/logger.js';

export interface DatabaseHealthResult {
  status: 'up' | 'down';
  latencyMs?: number;
  details?: {
    totalCount?: number;
    idleCount?: number;
    waitingCount?: number;
  };
  error?: string;
}

/**
 * Verifies connectivity to the PostgreSQL database cluster.
 * Performs a simple probe with latency measurement.
 */
export const checkDatabaseHealth = async (): Promise<DatabaseHealthResult> => {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1;');
      const latencyMs = Date.now() - start;
      return {
        status: 'up',
        latencyMs,
        details: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
        },
      };
    } finally {
      client.release();
    }
  } catch (error) {
    const latencyMs = Date.now() - start;
    const errorMessage = (error as Error).message;
    logger.warn(`PostgreSQL health check failed (${latencyMs}ms): ${errorMessage}`);
    return {
      status: 'down',
      latencyMs,
      error: 'Database connection failed',
    };
  }
};
