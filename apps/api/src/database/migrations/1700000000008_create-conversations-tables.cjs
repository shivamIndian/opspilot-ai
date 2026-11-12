/**
 * Migration: Create AI Chat Conversations and Messages Tables (Module 19)
 * Target Schema: app
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = pgm => {
  // 1. Conversations table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
      thread_id VARCHAR(128) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived_at TIMESTAMPTZ NULL,
      CONSTRAINT chk_conversation_status CHECK (status IN ('active', 'archived', 'deleted'))
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_org_user ON app.conversations (organization_id, user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_conversations_thread_id ON app.conversations (thread_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_org_status ON app.conversations (organization_id, status);
  `);

  // 2. Conversation Messages table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.conversation_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES app.conversations(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES app.users(id) ON DELETE SET NULL,
      role VARCHAR(32) NOT NULL,
      content TEXT NOT NULL,
      citations JSONB NOT NULL DEFAULT '[]',
      tool_calls JSONB NOT NULL DEFAULT '[]',
      action_proposals JSONB NOT NULL DEFAULT '[]',
      telemetry JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(32) NOT NULL DEFAULT 'completed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_message_role CHECK (role IN ('user', 'assistant', 'system')),
      CONSTRAINT chk_message_status CHECK (status IN ('sending', 'streaming', 'completed', 'failed', 'waiting_approval'))
    );

    CREATE INDEX IF NOT EXISTS idx_conv_messages_conv_created ON app.conversation_messages (conversation_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_conv_messages_org ON app.conversation_messages (organization_id);
  `);
};

exports.down = pgm => {
  pgm.sql(`
    DROP TABLE IF EXISTS app.conversation_messages CASCADE;
    DROP TABLE IF EXISTS app.conversations CASCADE;
  `);
};
