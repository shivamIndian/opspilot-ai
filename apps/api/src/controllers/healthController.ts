import type { Request, Response } from 'express';
import type { HealthResponse, ReadinessResponse } from '../types/index.js';
import { checkDatabaseHealth } from '../database/health.js';
import { checkRedisHealth } from '../redis/health.js';

/**
 * Liveness Probe: Returns process-level vitality (HTTP 200).
 * Does not check downstream dependencies.
 */
export const getHealth = (_req: Request, res: Response<HealthResponse>): void => {
  res.status(200).json({
    success: true,
    service: 'opspilot-api',
    status: 'healthy',
  });
};

/**
 * Readiness Probe: Verifies PostgreSQL and Redis connectivity.
 * Returns HTTP 200 when ready, HTTP 503 when dependencies fail.
 * Sanitized to never expose credentials, connection strings, or system paths.
 */
export const getReadiness = async (
  _req: Request,
  res: Response<ReadinessResponse>
): Promise<void> => {
  const [dbResult, redisResult] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  const isDbUp = dbResult.status === 'up';
  const isRedisUp = redisResult.status === 'up';
  const isAllReady = isDbUp && isRedisUp;

  const responseBody: ReadinessResponse = {
    success: isAllReady,
    service: 'opspilot-api',
    status: isAllReady ? 'ready' : 'unhealthy',
    dependencies: {
      database: isDbUp ? 'up' : 'down',
      redis: isRedisUp ? 'up' : 'down',
    },
  };

  if (!isAllReady) {
    responseBody.error = {
      code: 'DEPENDENCY_UNAVAILABLE',
      message: 'One or more required infrastructure dependencies are unavailable',
    };
    res.status(503).json(responseBody);
    return;
  }

  res.status(200).json(responseBody);
};
