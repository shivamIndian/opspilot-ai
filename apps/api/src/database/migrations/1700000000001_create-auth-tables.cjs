/**
 * Migration: Create Authentication & Authorization Tables
 * Target Schema: app
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = pgm => {
  // 1. Users table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password_hash TEXT NOT NULL,
      platform_role VARCHAR(50) NOT NULL DEFAULT 'user',
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      email_verified_at TIMESTAMPTZ NULL,
      password_changed_at TIMESTAMPTZ NULL,
      last_login_at TIMESTAMPTZ NULL,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_platform_role CHECK (platform_role IN ('user', 'platform_admin')),
      CONSTRAINT chk_user_status CHECK (status IN ('active', 'suspended'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON app.users (lower(email));
    CREATE INDEX IF NOT EXISTS idx_users_status ON app.users (status);
    CREATE INDEX IF NOT EXISTS idx_users_platform_role ON app.users (platform_role);
  `);

  // 2. User sessions (Refresh Token Families)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      token_family_id UUID NOT NULL,
      user_agent TEXT NULL,
      ip_address INET NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ NULL,
      replaced_by_session_id UUID NULL REFERENCES app.user_sessions(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMPTZ NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON app.user_sessions (user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON app.user_sessions (token_hash);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_family ON app.user_sessions (token_family_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON app.user_sessions (expires_at);
  `);

  // 3. Password reset tokens
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON app.password_reset_tokens (token_hash);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON app.password_reset_tokens (user_id);
  `);

  // 4. Email verification tokens
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.email_verification_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON app.email_verification_tokens (token_hash);
    CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON app.email_verification_tokens (user_id);
  `);

  // 5. Authentication Audit Logs
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.auth_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NULL REFERENCES app.users(id) ON DELETE SET NULL,
      event_type VARCHAR(100) NOT NULL,
      ip_address INET NULL,
      user_agent TEXT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON app.auth_audit_logs (user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type ON app.auth_audit_logs (event_type);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created_at ON app.auth_audit_logs (created_at DESC);
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = pgm => {
  pgm.sql(`
    DROP TABLE IF EXISTS app.auth_audit_logs CASCADE;
    DROP TABLE IF EXISTS app.email_verification_tokens CASCADE;
    DROP TABLE IF EXISTS app.password_reset_tokens CASCADE;
    DROP TABLE IF EXISTS app.user_sessions CASCADE;
    DROP TABLE IF EXISTS app.users CASCADE;
  `);
};
