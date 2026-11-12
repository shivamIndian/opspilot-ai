import { userRepository } from '../repositories/user.repository.js';
import { tokenRepository } from '../repositories/token.repository.js';
import { passwordService } from './password.service.js';
import { tokenService } from './token.service.js';
import { sessionService } from './session.service.js';
import { emailVerificationService } from './email-verification.service.js';
import { emailService } from '../../../integrations/email/email.service.js';
import { config } from '../../../config/env.js';
import type { RegisterInput, LoginInput } from '../validators/auth.schema.js';
import type { SafeUser, AuthTokens } from '../types/auth.types.js';

export class AuthService {
  /**
   * Registers a new user account with default 'user' platform role.
   * Public registration cannot specify platform_admin or modify status.
   */
  async register(
    input: RegisterInput,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<SafeUser> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    const passwordHash = await passwordService.hashPassword(input.password);

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password_hash: passwordHash,
      platform_role: 'user', // Enforce 'user' role
    });

    // Send verification email
    await emailVerificationService.createAndSendVerification(user);

    await tokenRepository.logAuditEvent({
      userId: user.id,
      eventType: 'USER_REGISTERED',
      ipAddress,
      userAgent,
      metadata: { role: user.platform_role },
    });

    return userRepository.toSafeUser(user);
  }

  /**
   * Authenticates a user, verifies credentials with Argon2id, and issues token pair.
   */
  async login(
    input: LoginInput,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(input.email);

    if (!user) {
      // Mitigate user enumeration: dummy hash verification timing
      await passwordService.verifyPassword(
        '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQAAAAAAAAAAA$dummyhashforconstanttimingcomparisontest',
        input.password
      );
      throw new Error('INVALID_CREDENTIALS');
    }

    if (user.status === 'suspended') {
      await tokenRepository.logAuditEvent({
        userId: user.id,
        eventType: 'LOGIN_BLOCKED_SUSPENDED',
        ipAddress,
        userAgent,
      });
      throw new Error('ACCOUNT_SUSPENDED');
    }

    const isValid = await passwordService.verifyPassword(user.password_hash, input.password);

    if (!isValid) {
      await userRepository.incrementFailedLoginAttempts(user.id);
      await tokenRepository.logAuditEvent({
        userId: user.id,
        eventType: 'LOGIN_FAILED',
        ipAddress,
        userAgent,
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    // Reset failed attempts & update last login
    await userRepository.updateLastLogin(user.id);

    // Issue Access Token
    const { token: accessToken, expiresIn } = tokenService.generateAccessToken(
      user.id,
      user.platform_role
    );

    // Issue Refresh Token & Create Session
    const { rawRefreshToken } = await sessionService.createSession(user.id, userAgent, ipAddress);

    // Generate CSRF Token for browser cookies
    const csrfToken = tokenService.generateCsrfToken();

    await tokenRepository.logAuditEvent({
      userId: user.id,
      eventType: 'LOGIN_SUCCESS',
      ipAddress,
      userAgent,
    });

    return {
      user: userRepository.toSafeUser(user),
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        csrfToken,
        expiresIn,
      },
    };
  }

  /**
   * Rotates refresh tokens and issues fresh access token.
   */
  async refresh(
    rawRefreshToken: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<AuthTokens> {
    const { newRawRefreshToken, userId, role } = await sessionService.rotateSession(
      rawRefreshToken,
      userAgent,
      ipAddress
    );

    const { token: accessToken, expiresIn } = tokenService.generateAccessToken(userId, role);
    const csrfToken = tokenService.generateCsrfToken();

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      csrfToken,
      expiresIn,
    };
  }

  /**
   * Logs out the current session.
   */
  async logout(rawRefreshToken: string): Promise<void> {
    await sessionService.revokeSessionByToken(rawRefreshToken);
  }

  /**
   * Logs out all active sessions for the user.
   */
  async logoutAll(userId: string): Promise<void> {
    await sessionService.revokeAllUserSessions(userId);
  }

  /**
   * Requests password reset link. Always succeeds generically to prevent enumeration.
   */
  async forgotPassword(
    email: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (user && user.status === 'active') {
      const rawToken = tokenService.generateRandomToken();
      const tokenHash = tokenService.hashToken(rawToken);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + config.PASSWORD_RESET_TOKEN_TTL_MINUTES);

      await tokenRepository.createPasswordResetToken(user.id, tokenHash, expiresAt);
      await emailService.sendPasswordResetEmail(user.email, rawToken);

      await tokenRepository.logAuditEvent({
        userId: user.id,
        eventType: 'PASSWORD_RESET_REQUESTED',
        ipAddress,
        userAgent,
      });
    }
  }

  /**
   * Resets password using one-time token and invalidates all existing user sessions.
   */
  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    const tokenHash = tokenService.hashToken(token);
    const tokenRecord = await tokenRepository.findPasswordResetToken(tokenHash);

    if (!tokenRecord) {
      throw new Error('INVALID_TOKEN');
    }

    if (tokenRecord.used_at !== null) {
      throw new Error('TOKEN_ALREADY_USED');
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
      throw new Error('TOKEN_EXPIRED');
    }

    const newHash = await passwordService.hashPassword(newPassword);

    // Update password, consume reset token, and revoke all sessions
    await userRepository.updatePassword(tokenRecord.user_id, newHash);
    await tokenRepository.markPasswordResetTokenUsed(tokenRecord.id);
    await sessionService.revokeAllUserSessions(tokenRecord.user_id);

    await tokenRepository.logAuditEvent({
      userId: tokenRecord.user_id,
      eventType: 'PASSWORD_RESET_SUCCESS',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Retrieves profile for currently authenticated user.
   */
  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    return userRepository.toSafeUser(user);
  }
}

export const authService = new AuthService();
