/**
 * Migration: Create Multi-Tenant Organization Tables
 * Target Schema: app
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = pgm => {
  // 1. Organizations table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(150) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      description TEXT NULL,
      logo_url TEXT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_by UUID NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_org_status CHECK (status IN ('active', 'suspended', 'archived'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug_lower ON app.organizations (lower(slug));
    CREATE INDEX IF NOT EXISTS idx_organizations_status ON app.organizations (status);
    CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON app.organizations (created_by);
    CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON app.organizations (created_at DESC);
  `);

  // 2. Organization Members table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.organization_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_org_member_role CHECK (role IN ('owner', 'admin', 'member')),
      CONSTRAINT chk_org_member_status CHECK (status IN ('active', 'suspended', 'removed'))
    );

    -- Unique membership per user per organization
    CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_org_user ON app.organization_members (organization_id, user_id);

    -- Enforce at most one active owner per organization at the database level
    CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_one_active_owner 
      ON app.organization_members (organization_id) 
      WHERE (role = 'owner' AND status = 'active');

    CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON app.organization_members (organization_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON app.organization_members (user_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_org_status ON app.organization_members (organization_id, status);
  `);

  // 3. Organization Invitations table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.organization_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      token_hash TEXT NOT NULL,
      invited_by UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ NULL,
      revoked_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_org_invitation_role CHECK (role IN ('admin', 'member')),
      CONSTRAINT chk_org_invitation_status CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
    );

    -- Enforce unique pending invitation per email per organization
    CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invitations_unique_pending 
      ON app.organization_invitations (organization_id, lower(email)) 
      WHERE status = 'pending';

    CREATE INDEX IF NOT EXISTS idx_org_invitations_token_hash ON app.organization_invitations (token_hash);
    CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON app.organization_invitations (organization_id);
    CREATE INDEX IF NOT EXISTS idx_org_invitations_status ON app.organization_invitations (status);
    CREATE INDEX IF NOT EXISTS idx_org_invitations_expires_at ON app.organization_invitations (expires_at);
  `);

  // 4. Organization Audit Logs table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.organization_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      actor_user_id UUID NULL REFERENCES app.users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(100) NULL,
      target_id UUID NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_org_audit_org_id ON app.organization_audit_logs (organization_id);
    CREATE INDEX IF NOT EXISTS idx_org_audit_actor ON app.organization_audit_logs (actor_user_id);
    CREATE INDEX IF NOT EXISTS idx_org_audit_action ON app.organization_audit_logs (action);
    CREATE INDEX IF NOT EXISTS idx_org_audit_created_at ON app.organization_audit_logs (created_at DESC);
  `);
};

exports.down = pgm => {
  pgm.sql(`
    DROP TABLE IF EXISTS app.organization_audit_logs CASCADE;
    DROP TABLE IF EXISTS app.organization_invitations CASCADE;
    DROP TABLE IF EXISTS app.organization_members CASCADE;
    DROP TABLE IF EXISTS app.organizations CASCADE;
  `);
};
