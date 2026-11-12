/**
 * Migration: Add Performance Indexes for High-Frequency Operational Queries (Module 24)
 * Target Schema: app
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = pgm => {
  pgm.sql(`
    -- Accelerates organization document catalog listing sorted by newest
    CREATE INDEX IF NOT EXISTS idx_documents_org_created_at 
      ON app.documents (organization_id, created_at DESC);

    -- Accelerates human-in-the-loop approval inbox listing and sorting
    CREATE INDEX IF NOT EXISTS idx_agent_proposals_org_created 
      ON app.agent_action_proposals (organization_id, created_at DESC);

    -- Accelerates ticket conversation thread retrieval sorted by chronological order
    CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_created 
      ON app.ticket_comments (ticket_id, created_at ASC);

    -- Accelerates filtered ticket lists by status and chronological recency
    CREATE INDEX IF NOT EXISTS idx_tickets_org_status_created 
      ON app.tickets (organization_id, status, created_at DESC);
  `);
};

exports.down = pgm => {
  pgm.sql(`
    DROP INDEX IF EXISTS app.idx_tickets_org_status_created;
    DROP INDEX IF EXISTS app.idx_ticket_comments_ticket_created;
    DROP INDEX IF EXISTS app.idx_agent_proposals_org_created;
    DROP INDEX IF EXISTS app.idx_documents_org_created_at;
  `);
};
