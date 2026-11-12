import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import * as dbHealth from '../src/database/health.js';
import * as redisHealth from '../src/redis/health.js';

describe('OpsPilot API Base & Health Endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET / should return root status message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      service: 'OpsPilot API',
      message: 'API is running',
    });
  });

  it('GET /api/v1/health (Liveness) should return 200 and healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      service: 'opspilot-api',
      status: 'healthy',
    });
  });

  it('GET /api/v1/health/ready should return 200 when database and redis are healthy', async () => {
    vi.spyOn(dbHealth, 'checkDatabaseHealth').mockResolvedValue({
      status: 'up',
      latencyMs: 3,
    });
    vi.spyOn(redisHealth, 'checkRedisHealth').mockResolvedValue({
      status: 'up',
      latencyMs: 1,
    });

    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      service: 'opspilot-api',
      status: 'ready',
      dependencies: {
        database: 'up',
        redis: 'up',
      },
    });
  });

  it('GET /api/v1/health/ready should return 503 when database is down (sanitized error)', async () => {
    vi.spyOn(dbHealth, 'checkDatabaseHealth').mockResolvedValue({
      status: 'down',
      latencyMs: 50,
      error: 'Database connection failed',
    });
    vi.spyOn(redisHealth, 'checkRedisHealth').mockResolvedValue({
      status: 'up',
      latencyMs: 1,
    });

    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      service: 'opspilot-api',
      status: 'unhealthy',
      dependencies: {
        database: 'down',
        redis: 'up',
      },
      error: {
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'One or more required infrastructure dependencies are unavailable',
      },
    });

    // Verify no credentials or connection string leaked
    const jsonStr = JSON.stringify(res.body);
    expect(jsonStr).not.toContain('password');
    expect(jsonStr).not.toContain('postgresql://');
  });

  it('GET /api/v1/health/ready should return 503 when redis is down (sanitized error)', async () => {
    vi.spyOn(dbHealth, 'checkDatabaseHealth').mockResolvedValue({
      status: 'up',
      latencyMs: 2,
    });
    vi.spyOn(redisHealth, 'checkRedisHealth').mockResolvedValue({
      status: 'down',
      latencyMs: 25,
      error: 'Redis connection failed',
    });

    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.dependencies.redis).toBe('down');
    expect(res.body.error?.code).toBe('DEPENDENCY_UNAVAILABLE');
  });

  it('GET /api/v1/unknown-route should return structured 404 response', async () => {
    const res = await request(app).get('/api/v1/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
