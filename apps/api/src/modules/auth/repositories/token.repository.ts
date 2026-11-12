import { pool } from '../../../database/index.js';
import type {
  PasswordResetTokenEntity,
  EmailVerificationTokenEntity,
} from '../types/auth.types.js';

export class TokenRepository {
  // --- Password Reset Tokens ---
  async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<PasswordResetTokenEntity> {
    const res = await pool.query<PasswordResetTokenEntity>(
      `INSERT INTO app.password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [userId, tokenHash, expiresAt]
    );
    return res.rows[0];
  }

  async findPasswordResetToken(tokenHash: string): Promise<PasswordResetTokenEntity | null> {
    const res = await pool.query<PasswordResetTokenEntity>(
      `SELECT * FROM app.password_reset_tokens
       WHERE token_hash = $1
       LIMIT 1;`,
      [tokenHash]
    );
    return res.rows[0] || null;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await pool.query(
      `UPDATE app.password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE id = $1;`,
      [id]
    );
  }

  // --- Email Verification Tokens ---
  async createEmailVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<EmailVerificationTokenEntity> {
    const res = await pool.query<EmailVerificationTokenEntity>(
      `INSERT INTO app.email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [userId, tokenHash, expiresAt]
    );
    return res.rows[0];
  }

  async findEmailVerificationToken(
    tokenHash: string
  ): Promise<EmailVerificationTokenEntity | null> {
    const res = await pool.query<EmailVerificationTokenEntity>(
      `SELECT * FROM app.email_verification_tokens
       WHERE token_hash = $1
       LIMIT 1;`,
      [tokenHash]
    );
    return res.rows[0] || null;
  }

  async markEmailVerificationTokenUsed(id: string): Promise<void> {
    await pool.query(
      `UPDATE app.email_verification_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE id = $1;`,
      [id]
    );
  }

  // --- Security Audit Logging ---
  async logAuditEvent(data: {
    userId?: string | null;
    eventType: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO app.auth_audit_logs (user_id, event_type, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5);`,
        [
          data.userId || null,
          data.eventType,
          data.ipAddress || null,
          data.userAgent || null,
          JSON.stringify(data.metadata || {}),
        ]
      );
    } catch {
      // Do not allow audit logging failure to crash request flow
    }
  }
}

export const tokenRepository = new TokenRepository();
