import { describe, it, expect } from 'vitest';
import { getSanitizedDatabaseUrl } from '../src/database/connection.js';

describe('Database Connection Module', () => {
  it('should mask sensitive credentials in database connection string', () => {
    const rawUrl =
      'postgresql://opspilot_api:super_secret_password@localhost:5432/opspilot_db?schema=app';
    const sanitized = getSanitizedDatabaseUrl(rawUrl);

    expect(sanitized).not.toContain('super_secret_password');
    expect(sanitized).toContain('***REDACTED***');
    expect(sanitized).toContain('opspilot_db');
  });

  it('should safely handle malformed URL without throwing exceptions', () => {
    const malformed = 'not-a-valid-url';
    const sanitized = getSanitizedDatabaseUrl(malformed);
    expect(sanitized).toBe('postgresql://***REDACTED***');
  });
});
