import { describe, it, expect } from 'vitest';
import { getSanitizedRedisUrl } from '../src/redis/client.js';

describe('Redis Connection Module', () => {
  it('should mask sensitive credentials in redis connection string', () => {
    const rawUrl = 'redis://:super_secret_redis_pass@localhost:6379/0';
    const sanitized = getSanitizedRedisUrl(rawUrl);

    expect(sanitized).not.toContain('super_secret_redis_pass');
    expect(sanitized).toContain('***REDACTED***');
    expect(sanitized).toContain('6379');
  });

  it('should safely handle malformed URL without throwing exceptions', () => {
    const malformed = 'not-a-valid-redis-url';
    const sanitized = getSanitizedRedisUrl(malformed);
    expect(sanitized).toBe('redis://***REDACTED***');
  });
});
