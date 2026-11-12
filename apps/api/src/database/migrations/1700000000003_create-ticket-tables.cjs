/**
 * Migration: Create Enterprise Support Ticket Tables
 * Target Schema: app
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = pgm => {
  // 1. Organization Ticket Counters table (concurrency-safe sequence per organization)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.organization_ticket_counters (
      organization_id UUID PRIMARY KEY REFERENCES app.organizations(id) ON DELETE CASCADE,
      last_ticket_number BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Tickets table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      ticket_number BIGINT NOT NULL,
      subject VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      priority VARCHAR(20) NOT NULL DEFAULT 'medium',
      status VARCHAR(30) NOT NULL DEFAULT 'open',
      created_by_user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
      assigned_to_user_id UUID NULL REFERENCES app.users(id) ON DELETE SET NULL,
      resolved_at TIMESTAMPTZ NULL,
      closed_at TIMESTAMPTZ NULL,
      archived_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_tickets_org_number UNIQUE (organization_id, ticket_number),
      CONSTRAINT chk_ticket_status CHECK (status IN ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
      CONSTRAINT chk_ticket_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      CONSTRAINT chk_ticket_category CHECK (category IN ('technical_support', 'account_access', 'bug_report', 'billing', 'feature_request', 'general'))
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_org_id ON app.tickets (organization_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_org_status ON app.tickets (organization_id, status);
    CREATE INDEX IF NOT EXISTS idx_tickets_org_priority ON app.tickets (organization_id, priority);
    CREATE INDEX IF NOT EXISTS idx_tickets_org_category ON app.tickets (organization_id, category);
    CREATE INDEX IF NOT EXISTS idx_tickets_org_created_by ON app.tickets (organization_id, created_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_org_assigned_to ON app.tickets (organization_id, assigned_to_user_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_org_archived ON app.tickets (organization_id, archived_at);
    CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON app.tickets (organization_id, created_at DESC);
  `);

  // 3. Ticket Comments table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.ticket_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      ticket_id UUID NOT NULL REFERENCES app.tickets(id) ON DELETE CASCADE,
      author_user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
      body TEXT NOT NULL,
      visibility VARCHAR(20) NOT NULL DEFAULT 'public',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NULL,
      CONSTRAINT chk_comment_visibility CHECK (visibility IN ('public', 'internal'))
    );

    CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON app.ticket_comments (ticket_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_ticket_comments_org_id ON app.ticket_comments (organization_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_comments_author ON app.ticket_comments (author_user_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_comments_visibility ON app.ticket_comments (ticket_id, visibility);
  `);

  // 4. Ticket Activity Logs table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.ticket_activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      ticket_id UUID NOT NULL REFERENCES app.tickets(id) ON DELETE CASCADE,
      actor_user_id UUID NULL REFERENCES app.users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      old_values JSONB NULL,
      new_values JSONB NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ticket_activity_ticket_id ON app.ticket_activity_logs (ticket_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_ticket_activity_org_id ON app.ticket_activity_logs (organization_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_activity_actor ON app.ticket_activity_logs (actor_user_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_activity_action ON app.ticket_activity_logs (action);
  `);
};

exports.down = pgm => {
  pgm.sql(`
    DROP TABLE IF EXISTS app.ticket_activity_logs CASCADE;
    DROP TABLE IF EXISTS app.ticket_comments CASCADE;
    DROP TABLE IF EXISTS app.tickets CASCADE;
    DROP TABLE IF EXISTS app.organization_ticket_counters CASCADE;
  `);
};
