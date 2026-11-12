import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { userRepository } from '../src/modules/auth/repositories/user.repository.js';
import { sessionRepository } from '../src/modules/auth/repositories/session.repository.js';
import { tokenRepository } from '../src/modules/auth/repositories/token.repository.js';
import { sessionService } from '../src/modules/auth/services/session.service.js';
import { emailVerificationService } from '../src/modules/auth/services/email-verification.service.js';
import { emailService } from '../src/integrations/email/email.service.js';
import { passwordService } from '../src/modules/auth/services/password.service.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import type {
  UserEntity,
  UserSessionEntity,
  PasswordResetTokenEntity,
  EmailVerificationTokenEntity,
} from '../src/modules/auth/types/auth.types.js';

describe('OpsPilot API – Authentication & Authorization Module 03', () => {
  const mockUser: UserEntity = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password_hash:
      '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQAAAAAAAAAAA$eGZ2L2k1U0ZXaFd4V1hhQ2xGdk5zL3Q4Ukl6QWp2ZjhUUEpLd01pTFRlQT0',
    platform_role: 'user',
    status: 'active',
    is_email_verified: true,
    failed_login_attempts: 0,
    last_login_at: new Date('2026-01-01T00:00:00Z'),
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  };

  const mockAdminUser: UserEntity = {
    ...mockUser,
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Admin User',
    email: 'admin@opspilot.local',
    platform_role: 'platform_admin',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(tokenRepository, 'logAuditEvent').mockResolvedValue();
    vi.spyOn(emailVerificationService, 'createAndSendVerification').mockResolvedValue('mock-token');
    vi.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue();
    vi.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue();
  });

  describe('1. User Registration', () => {
    it('POST /api/v1/auth/register should successfully register a new user and assign "user" role', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(userRepository, 'create').mockResolvedValue(mockUser);

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'Password123!@#',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('ada@example.com');
      expect(res.body.data.user.role).toBe('user');
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          platform_role: 'user',
        })
      );
    });

    it('POST /api/v1/auth/register should reject duplicate email with 409', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Duplicate User',
        email: 'ada@example.com',
        password: 'Password123!@#',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('POST /api/v1/auth/register should prevent platform_admin role escalation on public registration', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(userRepository, 'create').mockResolvedValue(mockUser);

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Hacker',
        email: 'hacker@example.com',
        password: 'Password123!@#',
        platform_role: 'platform_admin',
        role: 'platform_admin',
      });

      expect(res.status).toBe(201);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          platform_role: 'user',
        })
      );
    });

    it('POST /api/v1/auth/register should reject weak passwords failing OWASP guidelines', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Weak User',
        email: 'weak@example.com',
        password: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. User Login', () => {
    it('POST /api/v1/auth/login should authenticate valid credentials and issue tokens and cookies', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(true);
      vi.spyOn(userRepository, 'updateLastLogin').mockResolvedValue();
      vi.spyOn(sessionRepository, 'createSession').mockResolvedValue({
        id: 'session-123',
        user_id: mockUser.id,
        token_hash: 'tokenhash',
        token_family_id: 'family-123',
        parent_token_hash: null,
        user_agent: 'test-agent',
        ip_address: '127.0.0.1',
        revoked_at: null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'ada@example.com',
        password: 'Password123!@#',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('ada@example.com');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.csrfToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = cookies.join(';');
      expect(cookieStr).toContain('opspilot_refresh_token=');
      expect(cookieStr).toContain('HttpOnly');
      expect(cookieStr).toContain('opspilot_csrf_token=');
    });

    it('POST /api/v1/auth/login should fail with 401 for incorrect password', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(false);
      vi.spyOn(userRepository, 'incrementFailedLoginAttempts').mockResolvedValue();

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'ada@example.com',
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(userRepository.incrementFailedLoginAttempts).toHaveBeenCalledWith(mockUser.id);
    });

    it('POST /api/v1/auth/login should return 401 for non-existent email', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(passwordService, 'verifyPassword').mockResolvedValue(false);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'Password123!@#',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('POST /api/v1/auth/login should reject suspended accounts with 403', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue({
        ...mockUser,
        status: 'suspended',
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'ada@example.com',
        password: 'Password123!@#',
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('3. Token Refresh, Rotation & CSRF Protection', () => {
    it('POST /api/v1/auth/refresh should reject when CSRF header is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['opspilot_refresh_token=validtoken', 'opspilot_csrf_token=csrfval']);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('POST /api/v1/auth/refresh should reject when CSRF header does not match cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['opspilot_refresh_token=validtoken', 'opspilot_csrf_token=csrfval'])
        .set('X-CSRF-Token', 'differentcsrf');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_MISMATCH');
    });

    it('POST /api/v1/auth/refresh should reject when refresh cookie is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['opspilot_csrf_token=csrfval'])
        .set('X-CSRF-Token', 'csrfval');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('REFRESH_TOKEN_MISSING');
    });

    it('POST /api/v1/auth/refresh should rotate session and issue new tokens on valid request', async () => {
      const oldSession: UserSessionEntity = {
        id: 'session-old',
        user_id: mockUser.id,
        token_hash: tokenService.hashToken('raw-old-token'),
        token_family_id: 'family-100',
        parent_token_hash: null,
        user_agent: 'agent',
        ip_address: '127.0.0.1',
        revoked_at: null,
        expires_at: new Date(Date.now() + 60000),
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.spyOn(sessionRepository, 'findByTokenHash').mockResolvedValue(oldSession);
      vi.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(sessionRepository, 'rotateSessionTransaction').mockResolvedValue({
        id: 'session-new',
        user_id: mockUser.id,
        token_hash: 'newhash',
        token_family_id: 'family-100',
        parent_token_hash: oldSession.token_hash,
        user_agent: 'agent',
        ip_address: '127.0.0.1',
        revoked_at: null,
        expires_at: new Date(Date.now() + 600000),
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['opspilot_refresh_token=raw-old-token', 'opspilot_csrf_token=csrfval'])
        .set('X-CSRF-Token', 'csrfval');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.csrfToken).toBeDefined();
      expect(sessionRepository.rotateSessionTransaction).toHaveBeenCalled();
    });

    it('POST /api/v1/auth/refresh should detect token reuse and revoke the entire token family', async () => {
      const reusedSession: UserSessionEntity = {
        id: 'session-spent',
        user_id: mockUser.id,
        token_hash: tokenService.hashToken('spent-token'),
        token_family_id: 'family-compromised',
        parent_token_hash: null,
        user_agent: 'agent',
        ip_address: '127.0.0.1',
        revoked_at: new Date(), // Already revoked!
        expires_at: new Date(Date.now() + 60000),
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.spyOn(sessionRepository, 'findByTokenHash').mockResolvedValue(reusedSession);
      vi.spyOn(sessionRepository, 'revokeFamily').mockResolvedValue(5);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['opspilot_refresh_token=spent-token', 'opspilot_csrf_token=csrfval'])
        .set('X-CSRF-Token', 'csrfval');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_REUSE_DETECTED');
      expect(sessionRepository.revokeFamily).toHaveBeenCalledWith('family-compromised');
    });
  });

  describe('4. Session Logout & Invalidation', () => {
    it('POST /api/v1/auth/logout should revoke current session and clear cookies', async () => {
      vi.spyOn(sessionService, 'revokeSessionByToken').mockResolvedValue();

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', ['opspilot_refresh_token=active-token', 'opspilot_csrf_token=csrfval'])
        .set('X-CSRF-Token', 'csrfval');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'].join(';');
      expect(cookies).toContain('opspilot_refresh_token=;');
      expect(cookies).toContain('opspilot_csrf_token=;');
    });

    it('POST /api/v1/auth/logout-all should require Bearer token and revoke all user sessions', async () => {
      vi.spyOn(sessionService, 'revokeAllUserSessions').mockResolvedValue();

      const { token: jwt } = tokenService.generateAccessToken(mockUser.id, mockUser.platform_role);

      const res = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${jwt}`)
        .set('Cookie', ['opspilot_csrf_token=csrfval'])
        .set('X-CSRF-Token', 'csrfval');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('5. Password Reset Flow', () => {
    it('POST /api/v1/auth/forgot-password should return 200 generic message', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);
      vi.spyOn(tokenRepository, 'createPasswordResetToken').mockResolvedValue({
        id: 'reset-1',
        user_id: mockUser.id,
        token_hash: 'hash',
        expires_at: new Date(Date.now() + 3600000),
        used_at: null,
        created_at: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ada@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('POST /api/v1/auth/reset-password should update password, mark token used, and revoke sessions', async () => {
      const resetTokenRecord: PasswordResetTokenEntity = {
        id: 'reset-token-id',
        user_id: mockUser.id,
        token_hash: tokenService.hashToken('valid-raw-reset-token'),
        expires_at: new Date(Date.now() + 3600000),
        used_at: null,
        created_at: new Date(),
      };

      vi.spyOn(tokenRepository, 'findPasswordResetToken').mockResolvedValue(resetTokenRecord);
      vi.spyOn(userRepository, 'updatePassword').mockResolvedValue();
      vi.spyOn(tokenRepository, 'markPasswordResetTokenUsed').mockResolvedValue();
      vi.spyOn(sessionService, 'revokeAllUserSessions').mockResolvedValue();

      const res = await request(app).post('/api/v1/auth/reset-password').send({
        token: 'valid-raw-reset-token',
        newPassword: 'NewSecurePassword123!@#',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(userRepository.updatePassword).toHaveBeenCalled();
      expect(tokenRepository.markPasswordResetTokenUsed).toHaveBeenCalledWith('reset-token-id');
      expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith(mockUser.id);
    });

    it('POST /api/v1/auth/reset-password should reject already used token', async () => {
      const spentToken: PasswordResetTokenEntity = {
        id: 'reset-token-id',
        user_id: mockUser.id,
        token_hash: tokenService.hashToken('spent-reset-token'),
        expires_at: new Date(Date.now() + 3600000),
        used_at: new Date(),
        created_at: new Date(),
      };

      vi.spyOn(tokenRepository, 'findPasswordResetToken').mockResolvedValue(spentToken);

      const res = await request(app).post('/api/v1/auth/reset-password').send({
        token: 'spent-reset-token',
        newPassword: 'NewSecurePassword123!@#',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
    });
  });

  describe('6. Email Verification Flow', () => {
    it('POST /api/v1/auth/verify-email should mark email verified with valid token', async () => {
      const tokenRecord: EmailVerificationTokenEntity = {
        id: 'verify-token-id',
        user_id: mockUser.id,
        token_hash: tokenService.hashToken('raw-verify-token'),
        expires_at: new Date(Date.now() + 86400000),
        used_at: null,
        created_at: new Date(),
      };

      vi.spyOn(tokenRepository, 'findEmailVerificationToken').mockResolvedValue(tokenRecord);
      vi.spyOn(userRepository, 'markEmailVerified').mockResolvedValue();
      vi.spyOn(tokenRepository, 'markEmailVerificationTokenUsed').mockResolvedValue();

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'raw-verify-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(userRepository.markEmailVerified).toHaveBeenCalledWith(mockUser.id);
      expect(tokenRepository.markEmailVerificationTokenUsed).toHaveBeenCalledWith(
        'verify-token-id'
      );
    });

    it('POST /api/v1/auth/resend-verification should dispatch new verification link', async () => {
      vi.spyOn(emailVerificationService, 'resendVerification').mockResolvedValue();

      const res = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'ada@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(emailVerificationService.resendVerification).toHaveBeenCalledWith('ada@example.com');
    });
  });

  describe('7. Authentication & Authorization Middleware', () => {
    it('GET /api/v1/auth/me should return current user profile when valid JWT provided', async () => {
      vi.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);
      const { token: jwt } = tokenService.generateAccessToken(mockUser.id, mockUser.platform_role);

      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${jwt}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(mockUser.id);
      expect(res.body.data.user.email).toBe(mockUser.email);
    });

    it('GET /api/v1/auth/me should reject with 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/v1/auth/me should reject with 401 for malformed JWT', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.structure');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('GET /api/v1/auth/admin/verify should allow platform_admin', async () => {
      const { token: adminJwt } = tokenService.generateAccessToken(
        mockAdminUser.id,
        mockAdminUser.platform_role
      );

      const res = await request(app)
        .get('/api/v1/auth/admin/verify')
        .set('Authorization', `Bearer ${adminJwt}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Platform admin access verified');
    });

    it('GET /api/v1/auth/admin/verify should reject standard user with 403 FORBIDDEN', async () => {
      const { token: userJwt } = tokenService.generateAccessToken(
        mockUser.id,
        mockUser.platform_role
      );

      const res = await request(app)
        .get('/api/v1/auth/admin/verify')
        .set('Authorization', `Bearer ${userJwt}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
