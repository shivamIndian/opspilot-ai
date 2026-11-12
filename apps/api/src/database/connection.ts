import pg from 'pg';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

// Mask credentials for secure logging
export const getSanitizedDatabaseUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***REDACTED***';
    }
    return parsed.toString();
  } catch {
    return 'postgresql://***REDACTED***';
  }
};

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.DATABASE_POOL_MAX,
  idleTimeoutMillis: config.DATABASE_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: config.DATABASE_CONNECTION_TIMEOUT_MS,
});

// Pool Lifecycle & Event Listeners
pool.on('connect', client => {
  logger.debug('New PostgreSQL client connected from pool to schema app');
  // Set search_path for every pooled connection
  client.query('SET search_path TO app, public;').catch(err => {
    logger.error('Failed to set search_path on client connect:', err.message);
  });
});

pool.on('error', (err: Error) => {
  // Operational error on idle client in pool
  logger.error('Unexpected error on idle PostgreSQL client:', err.message);
});

pool.on('remove', () => {
  logger.debug('PostgreSQL client removed from pool');
});

/**
 * Execute a parameterized query with automated error logging and timing.
 */
export const query = async <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug(`Executed query in ${duration}ms: ${text.slice(0, 80)}`);
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(
      `Query failed after ${duration}ms [${text.slice(0, 80)}]:`,
      (error as Error).message
    );
    throw error;
  }
};

/**
 * Gracefully close all active clients in the connection pool.
 */
export const closePool = async (): Promise<void> => {
  logger.info('Closing PostgreSQL connection pool...');
  try {
    await pool.end();
    logger.info('PostgreSQL connection pool terminated cleanly.');
  } catch (error) {
    logger.error('Error while closing PostgreSQL pool:', (error as Error).message);
  }
};
