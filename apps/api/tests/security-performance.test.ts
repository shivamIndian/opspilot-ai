import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { redactSensitiveData } from '../src/utils/logger.js';
import type { OrganizationMember } from '../src/modules/organizations/types/organization.types.js';

describe('Module 24: Security & Performance Hardening Suite', () => {
  const app = createApp();

  const userA = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'usera@tenant-alpha.com',
    platform_role: 'user' as const,
  };

  const orgAlphaId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const orgBetaId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  let tokenUserA: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    tokenUserA = tokenService.generateAccessToken(userA.id, userA.platform_role).token;
  });

  describe('1. Cross-Tenant Authorization & IDOR Defense', () => {
    it('blocks access when user attempts to access resources of an organization they do not belong to', async () => {
      // User A is only an active member of Org Alpha, NOT Org Beta
      vi.spyOn(organizationRepository, 'findById').mockImplementation(async (id: string) => {
        if (id === orgBetaId) {
          return {
            id: orgBetaId,
            name: 'Beta Corp',
            slug: 'beta-corp',
            status: 'active',
            created_by: 'some-other-user',
            created_at: new Date(),
            updated_at: new Date(),
          };
        }
        return null;
      });

      vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(async (orgId: string, userId: string) => {
        if (orgId === orgAlphaId && userId === userA.id) {
          return {
            id: 'mem-alpha',
            organization_id: orgAlphaId,
            user_id: userA.id,
            role: 'member',
            status: 'active',
            joined_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          } as OrganizationMember;
        }
        return null; // Not a member of Org Beta
      });

      const res = await request(app)
        .get(`/api/v1/organizations/${orgBetaId}/tickets`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .set('x-bypass-csrf', 'true');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('rejects malformed non-UUID organization identifiers at the boundary', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/not-a-valid-uuid/tickets')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .set('x-bypass-csrf', 'true');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ORGANIZATION_ID');
    });
  });

  describe('2. HTTP Security Headers & Helmet Configuration', () => {
    it('returns strict security headers on all responses', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('3. Bounded Request Body & Payload DoS Defense', () => {
    it('rejects oversized JSON payloads exceeding 2MB with 413 Payload Too Large', async () => {
      // Create a payload larger than 2MB
      const largeContent = 'A'.repeat(2.5 * 1024 * 1024);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: largeContent });

      expect(res.status).toBe(413);
    });
  });

  describe('4. Automated Credential & Secret Redaction in Logger', () => {
    it('redacts sensitive fields in nested objects', () => {
      const sensitivePayload = {
        userId: 'user-123',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        apiKey: 'sk-proj-9999999999999999',
        authorization: 'Bearer secret-auth-token',
        nested: {
          secret: 'internal-signing-key',
          normalData: 'visible-metadata',
        },
      };

      const redacted = redactSensitiveData(sensitivePayload) as Record<string, unknown>;

      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.apiKey).toBe('[REDACTED]');
      expect(redacted.authorization).toBe('[REDACTED]');
      expect((redacted.nested as Record<string, unknown>).secret).toBe('[REDACTED]');
      expect((redacted.nested as Record<string, unknown>).normalData).toBe('visible-metadata');
    });

    it('redacts inline bearer tokens in string logs', () => {
      const logString = 'Request processed with Authorization: Bearer abc123def456 and token="secret123"';
      const redacted = redactSensitiveData(logString) as string;

      expect(redacted).toContain('Bearer [REDACTED]');
      expect(redacted).not.toContain('abc123def456');
    });
  });

  describe('5. CSRF Token Defense Enforcement', () => {
    it('rejects state-changing requests when CSRF token is mismatched', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['opspilot_csrf_token=token-in-cookie'])
        .set('x-csrf-token', 'different-token-in-header');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_MISMATCH');
    });
  });
});
