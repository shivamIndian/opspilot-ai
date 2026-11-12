import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/env.js';
import type { DelegatedTokenPayload } from '../types/agent-tools.types.js';

export class DelegationTokenService {
  private issuer = 'opspilot:core-api';
  private audience = 'opspilot:agent-tools';

  /**
   * Generates a signed, short-lived delegated authorization token for agent tool execution.
   */
  generateDelegationToken(params: {
    userId: string;
    organizationId: string;
    requestId: string;
    scopes: string[];
    expiresIn?: string;
  }): { token: string; jti: string; expiresInSeconds: number } {
    const jti = crypto.randomUUID();
    const expiresIn = params.expiresIn || '15m';
    const expiresInSeconds = 15 * 60;

    const payload: Omit<DelegatedTokenPayload, 'iat' | 'exp'> = {
      sub: params.userId,
      orgId: params.organizationId,
      requestId: params.requestId,
      scopes: params.scopes,
      iss: this.issuer,
      aud: this.audience,
      jti,
    };

    const token = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      algorithm: 'HS256',
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    });

    return {
      token,
      jti,
      expiresInSeconds,
    };
  }

  /**
   * Verifies and decodes a delegated authorization token.
   * Enforces algorithm, audience, and issuer validation.
   */
  verifyDelegationToken(token: string): DelegatedTokenPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, {
        algorithms: ['HS256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as DelegatedTokenPayload;

      if (!decoded.sub || !decoded.orgId || !decoded.scopes || !Array.isArray(decoded.scopes)) {
        throw new Error('Malformed delegation token payload: missing required claims');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Delegation assertion verification failed: ${(error as Error).message}`);
    }
  }
}

export const delegationTokenService = new DelegationTokenService();
