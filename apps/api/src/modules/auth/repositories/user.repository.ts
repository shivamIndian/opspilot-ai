import { pool } from '../../../database/index.js';
import type { UserEntity, SafeUser, PlatformRole } from '../types/auth.types.js';

export class UserRepository {
  async findByEmail(email: string): Promise<UserEntity | null> {
    const res = await pool.query<UserEntity>(
      'SELECT * FROM app.users WHERE lower(email) = lower($1) LIMIT 1;',
      [email.trim()]
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const res = await pool.query<UserEntity>('SELECT * FROM app.users WHERE id = $1 LIMIT 1;', [
      id,
    ]);
    return res.rows[0] || null;
  }

  async create(data: {
    name: string;
    email: string;
    password_hash: string;
    platform_role?: PlatformRole;
  }): Promise<UserEntity> {
    const res = await pool.query<UserEntity>(
      `INSERT INTO app.users (name, email, password_hash, platform_role, status)
       VALUES ($1, lower($2), $3, $4, 'active')
       RETURNING *;`,
      [data.name.trim(), data.email.trim(), data.password_hash, data.platform_role || 'user']
    );
    return res.rows[0];
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await pool.query(
      `UPDATE app.users
       SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2;`,
      [passwordHash, userId]
    );
  }

  async markEmailVerified(userId: string): Promise<void> {
    await pool.query(
      `UPDATE app.users
       SET email_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1;`,
      [userId]
    );
  }

  async updateLastLogin(userId: string): Promise<void> {
    await pool.query(
      `UPDATE app.users
       SET last_login_at = CURRENT_TIMESTAMP, failed_login_attempts = 0, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1;`,
      [userId]
    );
  }

  async incrementFailedLoginAttempts(userId: string): Promise<number> {
    const res = await pool.query<{ failed_login_attempts: number }>(
      `UPDATE app.users
       SET failed_login_attempts = failed_login_attempts + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING failed_login_attempts;`,
      [userId]
    );
    return res.rows[0]?.failed_login_attempts || 0;
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await pool.query(
      `UPDATE app.users
       SET failed_login_attempts = 0, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1;`,
      [userId]
    );
  }

  async updatePlatformRole(userId: string, role: PlatformRole): Promise<UserEntity | null> {
    const res = await pool.query<UserEntity>(
      `UPDATE app.users
       SET platform_role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *;`,
      [role, userId]
    );
    return res.rows[0] || null;
  }

  toSafeUser(user: UserEntity): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.platform_role,
      status: user.status,
      emailVerified: Boolean(user.email_verified_at),
      createdAt: user.created_at.toISOString(),
    };
  }
}

export const userRepository = new UserRepository();
