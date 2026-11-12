import { pool } from '../../../database/index.js';
import type { UserSessionEntity } from '../types/auth.types.js';

export class SessionRepository {
  async createSession(data: {
    userId: string;
    tokenHash: string;
    tokenFamilyId: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }): Promise<UserSessionEntity> {
    const res = await pool.query<UserSessionEntity>(
      `INSERT INTO app.user_sessions (user_id, token_hash, token_family_id, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [
        data.userId,
        data.tokenHash,
        data.tokenFamilyId,
        data.userAgent || null,
        data.ipAddress || null,
        data.expiresAt,
      ]
    );
    return res.rows[0];
  }

  async findByTokenHash(tokenHash: string): Promise<UserSessionEntity | null> {
    const res = await pool.query<UserSessionEntity>(
      `SELECT * FROM app.user_sessions WHERE token_hash = $1 LIMIT 1;`,
      [tokenHash]
    );
    return res.rows[0] || null;
  }

  async findById(sessionId: string): Promise<UserSessionEntity | null> {
    const res = await pool.query<UserSessionEntity>(
      `SELECT * FROM app.user_sessions WHERE id = $1 LIMIT 1;`,
      [sessionId]
    );
    return res.rows[0] || null;
  }

  /**
   * Performs atomic refresh token rotation:
   * 1. Inserts the new session record in the same token family.
   * 2. Marks the previous session as revoked and sets replaced_by_session_id.
   * 3. Executed inside an explicit transaction with row-level locking.
   */
  async rotateSessionTransaction(
    oldSessionId: string,
    newSessionData: {
      userId: string;
      tokenHash: string;
      tokenFamilyId: string;
      userAgent?: string | null;
      ipAddress?: string | null;
      expiresAt: Date;
    }
  ): Promise<UserSessionEntity> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Lock old session row
      const oldCheck = await client.query<UserSessionEntity>(
        'SELECT * FROM app.user_sessions WHERE id = $1 FOR UPDATE;',
        [oldSessionId]
      );

      if (!oldCheck.rows[0]) {
        throw new Error('Old session record not found');
      }

      if (oldCheck.rows[0].revoked_at !== null) {
        throw new Error('SESSION_ALREADY_REVOKED');
      }

      // Create new session
      const newSessionRes = await client.query<UserSessionEntity>(
        `INSERT INTO app.user_sessions (user_id, token_hash, token_family_id, user_agent, ip_address, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *;`,
        [
          newSessionData.userId,
          newSessionData.tokenHash,
          newSessionData.tokenFamilyId,
          newSessionData.userAgent || null,
          newSessionData.ipAddress || null,
          newSessionData.expiresAt,
        ]
      );
      const newSession = newSessionRes.rows[0];

      // Mark old session as revoked and replaced
      await client.query(
        `UPDATE app.user_sessions
         SET revoked_at = CURRENT_TIMESTAMP, replaced_by_session_id = $1, last_used_at = CURRENT_TIMESTAMP
         WHERE id = $2;`,
        [newSession.id, oldSessionId]
      );

      await client.query('COMMIT;');
      return newSession;
    } catch (error) {
      await client.query('ROLLBACK;');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Revokes all sessions belonging to a compromised token family.
   * Called immediately upon detecting refresh token reuse.
   */
  async revokeFamily(familyId: string): Promise<number> {
    const res = await pool.query(
      `UPDATE app.user_sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE token_family_id = $1 AND revoked_at IS NULL;`,
      [familyId]
    );
    return res.rowCount || 0;
  }

  /**
   * Revokes all active sessions for a user (e.g. on logout-all or password reset).
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const res = await pool.query(
      `UPDATE app.user_sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND revoked_at IS NULL;`,
      [userId]
    );
    return res.rowCount || 0;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await pool.query(
      `UPDATE app.user_sessions
       SET revoked_at = CURRENT_TIMESTAMP, last_used_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND revoked_at IS NULL;`,
      [sessionId]
    );
  }
}

export const sessionRepository = new SessionRepository();
