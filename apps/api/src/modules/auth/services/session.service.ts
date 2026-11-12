import crypto from 'crypto';
import { tokenService } from './token.service.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { tokenRepository } from '../repositories/token.repository.js';
import type { UserSessionEntity, PlatformRole } from '../types/auth.types.js';

export class SessionService {
  private readonly defaultExpiryDays = 7;

  /**
   * Calculates a Date object based on the configured expiration string (e.g., '7d').
   */
  private getExpirationDate(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.defaultExpiryDays);
    return expiresAt;
  }

  /**
   * Initializes a brand-new session and refresh token family for a freshly logged-in user.
   */
  async createSession(
    userId: string,
    userAgent?: string | null,
    ipAddress?: string | null
  ): Promise<{ rawRefreshToken: string; session: UserSessionEntity }> {
    const rawRefreshToken = tokenService.generateRandomToken();
    const tokenHash = tokenService.hashToken(rawRefreshToken);
    const tokenFamilyId = crypto.randomUUID();
    const expiresAt = this.getExpirationDate();

    const session = await sessionRepository.createSession({
      userId,
      tokenHash,
      tokenFamilyId,
      userAgent,
      ipAddress,
      expiresAt,
    });

    await tokenRepository.logAuditEvent({
      userId,
      eventType: 'SESSION_CREATED',
      ipAddress,
      userAgent,
      metadata: { sessionId: session.id, tokenFamilyId },
    });

    return { rawRefreshToken, session };
  }

  /**
   * Rotates an existing refresh token with active reuse detection.
   * If an already-revoked token is presented, the entire token family is invalidated.
   */
  async rotateSession(
    rawRefreshToken: string,
    userAgent?: string | null,
    ipAddress?: string | null
  ): Promise<{
    newRawRefreshToken: string;
    userId: string;
    role: PlatformRole;
  }> {
    const tokenHash = tokenService.hashToken(rawRefreshToken);
    const session = await sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // 1. REUSE DETECTION: If token was already revoked, a malicious replay or theft occurred.
    if (session.revoked_at !== null) {
      await sessionRepository.revokeFamily(session.token_family_id);
      await tokenRepository.logAuditEvent({
        userId: session.user_id,
        eventType: 'REFRESH_TOKEN_REUSE_DETECTED',
        ipAddress,
        userAgent,
        metadata: {
          compromisedFamilyId: session.token_family_id,
          attemptedSessionId: session.id,
        },
      });
      throw new Error('REFRESH_TOKEN_REUSE_DETECTED');
    }

    // 2. EXPIRATION CHECK
    if (new Date() > new Date(session.expires_at)) {
      await sessionRepository.revokeSession(session.id);
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }

    // 3. USER STATUS CHECK
    const user = await userRepository.findById(session.user_id);
    if (!user || user.status !== 'active') {
      await sessionRepository.revokeFamily(session.token_family_id);
      throw new Error('USER_INACTIVE_OR_SUSPENDED');
    }

    // 4. ATOMIC TOKEN ROTATION
    const newRawRefreshToken = tokenService.generateRandomToken();
    const newTokenHash = tokenService.hashToken(newRawRefreshToken);
    const expiresAt = this.getExpirationDate();

    await sessionRepository.rotateSessionTransaction(session.id, {
      userId: session.user_id,
      tokenHash: newTokenHash,
      tokenFamilyId: session.token_family_id, // Preserves token family
      userAgent,
      ipAddress,
      expiresAt,
    });

    await tokenRepository.logAuditEvent({
      userId: session.user_id,
      eventType: 'REFRESH_TOKEN_ROTATED',
      ipAddress,
      userAgent,
      metadata: { tokenFamilyId: session.token_family_id },
    });

    return {
      newRawRefreshToken,
      userId: user.id,
      role: user.platform_role,
    };
  }

  /**
   * Revokes a single session via raw token (User Logout).
   */
  async revokeSessionByToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = tokenService.hashToken(rawRefreshToken);
    const session = await sessionRepository.findByTokenHash(tokenHash);
    if (session && session.revoked_at === null) {
      await sessionRepository.revokeSession(session.id);
      await tokenRepository.logAuditEvent({
        userId: session.user_id,
        eventType: 'SESSION_REVOKED',
        metadata: { sessionId: session.id },
      });
    }
  }

  /**
   * Revokes all active sessions for a user (Logout from all devices).
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const count = await sessionRepository.revokeAllUserSessions(userId);
    await tokenRepository.logAuditEvent({
      userId,
      eventType: 'ALL_SESSIONS_REVOKED',
      metadata: { revokedCount: count },
    });
  }
}

export const sessionService = new SessionService();
