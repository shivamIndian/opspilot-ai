import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/env.js';
import type { JwtAccessPayload, PlatformRole } from '../types/auth.types.js';

export class TokenService {
  /**
   * Generates a signed JWT access token with standard OWASP claims.
   */
  generateAccessToken(
    userId: string,
    role: PlatformRole
  ): { token: string; jti: string; expiresIn: number } {
    const jti = crypto.randomUUID();
    const expiresInSeconds = 15 * 60; // 15 minutes

    const payload: Omit<JwtAccessPayload, 'iat' | 'exp'> = {
      sub: userId,
      role,
      jti,
      iss: config.JWT_ISSUER,
      aud: config.JWT_AUDIENCE,
    };

    const token = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      algorithm: 'HS256',
      expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return {
      token,
      jti,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Verifies and decodes a JWT access token, enforcing issuer, audience, and algorithm.
   */
  verifyAccessToken(token: string): JwtAccessPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, {
        algorithms: ['HS256'],
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
      }) as JwtAccessPayload;

      if (!decoded.sub || !decoded.role || !decoded.jti) {
        throw new Error('Missing required JWT claims');
      }

      if (decoded.role !== 'user' && decoded.role !== 'platform_admin') {
        throw new Error('Unsupported platform role in JWT claim');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Token verification failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generates a high-entropy cryptographically secure random token (64 hex chars).
   */
  generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Computes a SHA-256 hash of a raw token for secure database storage.
   */
  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generates a high-entropy random CSRF token.
   */
  generateCsrfToken(): string {
    return crypto.randomBytes(24).toString('hex');
  }
}

export const tokenService = new TokenService();
