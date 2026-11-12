/**
 * Migration: Create Human-in-the-Loop Agent Action Approval Tables (Module 14)
 * Target Schema: app
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = pgm => {
  // 1. Proposals table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.agent_action_proposals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      run_id VARCHAR(128) NOT NULL,
      thread_id VARCHAR(128) NOT NULL,
      requested_by UUID NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
      action_type VARCHAR(64) NOT NULL,
      tool_name VARCHAR(64) NOT NULL,
      risk_level VARCHAR(16) NOT NULL DEFAULT 'medium',
      proposal_payload JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(32) NOT NULL DEFAULT 'awaiting_approval',
      justification TEXT NULL,
      policy_snapshot JSONB NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMPTZ NULL,
      CONSTRAINT chk_proposal_status CHECK (status IN ('awaiting_approval', 'approved', 'rejected', 'executed', 'failed', 'cancelled')),
      CONSTRAINT chk_proposal_risk CHECK (risk_level IN ('low', 'medium', 'high', 'critical'))
    );

    CREATE INDEX IF NOT EXISTS idx_agent_proposals_org_id ON app.agent_action_proposals (organization_id);
    CREATE INDEX IF NOT EXISTS idx_agent_proposals_org_status ON app.agent_action_proposals (organization_id, status);
    CREATE INDEX IF NOT EXISTS idx_agent_proposals_run_id ON app.agent_action_proposals (run_id);
    CREATE INDEX IF NOT EXISTS idx_agent_proposals_thread_id ON app.agent_action_proposals (thread_id);
    CREATE INDEX IF NOT EXISTS idx_agent_proposals_requested_by ON app.agent_action_proposals (requested_by);
  `);

  // 2. Approvals table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.agent_action_approvals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id UUID NOT NULL REFERENCES app.agent_action_proposals(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      decision VARCHAR(16) NOT NULL,
      decided_by UUID NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
      decision_reason TEXT NULL,
      decided_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_approval_decision CHECK (decision IN ('approved', 'rejected'))
    );

    CREATE INDEX IF NOT EXISTS idx_agent_approvals_proposal_id ON app.agent_action_approvals (proposal_id);
    CREATE INDEX IF NOT EXISTS idx_agent_approvals_org_id ON app.agent_action_approvals (organization_id);
    CREATE INDEX IF NOT EXISTS idx_agent_approvals_decided_by ON app.agent_action_approvals (decided_by);
  `);

  // 3. Executions table (Idempotency and execution results)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.agent_action_executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id UUID NOT NULL REFERENCES app.agent_action_proposals(id) ON DELETE CASCADE UNIQUE,
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      executed_by UUID NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
      execution_status VARCHAR(32) NOT NULL DEFAULT 'pending',
      target_entity_type VARCHAR(64) NULL,
      target_entity_id VARCHAR(128) NULL,
      execution_result JSONB NULL,
      error_details JSONB NULL,
      idempotency_key VARCHAR(128) NOT NULL UNIQUE,
      started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMPTZ NULL,
      CONSTRAINT chk_execution_status CHECK (execution_status IN ('pending', 'success', 'failed'))
    );

    CREATE INDEX IF NOT EXISTS idx_agent_executions_proposal_id ON app.agent_action_executions (proposal_id);
    CREATE INDEX IF NOT EXISTS idx_agent_executions_org_id ON app.agent_action_executions (organization_id);
    CREATE INDEX IF NOT EXISTS idx_agent_executions_idempotency ON app.agent_action_executions (idempotency_key);
  `);

  // 4. Outbox table (Reliable transactional event dispatch)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.agent_workflow_outbox (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id UUID NOT NULL REFERENCES app.agent_action_proposals(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      event_type VARCHAR(64) NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 5,
      last_error TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMPTZ NULL,
      next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_outbox_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
    );

    CREATE INDEX IF NOT EXISTS idx_agent_outbox_pending ON app.agent_workflow_outbox (status, next_attempt_at) WHERE status IN ('pending', 'processing');
    CREATE INDEX IF NOT EXISTS idx_agent_outbox_proposal_id ON app.agent_workflow_outbox (proposal_id);
    CREATE INDEX IF NOT EXISTS idx_agent_outbox_org_id ON app.agent_workflow_outbox (organization_id);
  `);
};

exports.down = pgm => {
  pgm.sql(`
    DROP TABLE IF EXISTS app.agent_workflow_outbox CASCADE;
    DROP TABLE IF EXISTS app.agent_action_executions CASCADE;
    DROP TABLE IF EXISTS app.agent_action_approvals CASCADE;
    DROP TABLE IF EXISTS app.agent_action_proposals CASCADE;
  `);
};
