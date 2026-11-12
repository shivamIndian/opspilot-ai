import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../database/index.js';
import type {
  ConversationEntity,
  ConversationMessageEntity,
  SafeConversation,
  SafeConversationMessage,
} from '../types/conversation.types.js';

export class ConversationRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async createConversation(
    data: {
      organizationId: string;
      userId: string;
      title?: string;
      threadId: string;
    },
    client?: PoolClient
  ): Promise<ConversationEntity> {
    const executor = client || this.db;
    const title = data.title?.trim() || 'New Conversation';

    const query = `
      INSERT INTO app.conversations (organization_id, user_id, title, thread_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const res = await executor.query<ConversationEntity>(query, [
      data.organizationId,
      data.userId,
      title,
      data.threadId,
    ]);

    return res.rows[0];
  }

  async listConversations(
    organizationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ConversationEntity[]> {
    const query = `
      SELECT 
        c.*,
        (
          SELECT m.content 
          FROM app.conversation_messages m 
          WHERE m.conversation_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) AS last_message,
        (
          SELECT COUNT(*)::int 
          FROM app.conversation_messages m 
          WHERE m.conversation_id = c.id
        ) AS message_count
      FROM app.conversations c
      WHERE c.organization_id = $1 
        AND c.user_id = $2 
        AND c.archived_at IS NULL
      ORDER BY c.updated_at DESC
      LIMIT $3 OFFSET $4;
    `;

    const res = await this.db.query<ConversationEntity>(query, [
      organizationId,
      userId,
      limit,
      offset,
    ]);

    return res.rows;
  }

  async getConversationById(
    organizationId: string,
    userId: string,
    conversationId: string
  ): Promise<ConversationEntity | null> {
    const query = `
      SELECT c.* 
      FROM app.conversations c
      WHERE c.id = $1 
        AND c.organization_id = $2 
        AND c.user_id = $3 
        AND c.archived_at IS NULL;
    `;

    const res = await this.db.query<ConversationEntity>(query, [
      conversationId,
      organizationId,
      userId,
    ]);

    return res.rows[0] || null;
  }

  async updateTitle(
    organizationId: string,
    userId: string,
    conversationId: string,
    title: string
  ): Promise<ConversationEntity | null> {
    const query = `
      UPDATE app.conversations
      SET title = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND organization_id = $3 AND user_id = $4 AND archived_at IS NULL
      RETURNING *;
    `;

    const res = await this.db.query<ConversationEntity>(query, [
      title.trim(),
      conversationId,
      organizationId,
      userId,
    ]);

    return res.rows[0] || null;
  }

  async touchConversation(conversationId: string): Promise<void> {
    await this.db.query(
      `UPDATE app.conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
      [conversationId]
    );
  }

  async archiveConversation(
    organizationId: string,
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    const query = `
      UPDATE app.conversations
      SET status = 'archived', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND organization_id = $2 AND user_id = $3 AND archived_at IS NULL;
    `;

    const res = await this.db.query(query, [conversationId, organizationId, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  async createMessage(
    data: {
      conversationId: string;
      organizationId: string;
      userId?: string | null;
      role: 'user' | 'assistant' | 'system';
      content: string;
      citations?: unknown[];
      toolCalls?: unknown[];
      actionProposals?: unknown[];
      telemetry?: Record<string, unknown>;
      status?: string;
    },
    client?: PoolClient
  ): Promise<ConversationMessageEntity> {
    const executor = client || this.db;

    const query = `
      INSERT INTO app.conversation_messages (
        conversation_id,
        organization_id,
        user_id,
        role,
        content,
        citations,
        tool_calls,
        action_proposals,
        telemetry,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const res = await executor.query<ConversationMessageEntity>(query, [
      data.conversationId,
      data.organizationId,
      data.userId || null,
      data.role,
      data.content,
      JSON.stringify(data.citations || []),
      JSON.stringify(data.toolCalls || []),
      JSON.stringify(data.actionProposals || []),
      JSON.stringify(data.telemetry || {}),
      data.status || 'completed',
    ]);

    // Touch conversation updated_at
    await executor.query(
      `UPDATE app.conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
      [data.conversationId]
    );

    return res.rows[0];
  }

  async listMessages(
    organizationId: string,
    conversationId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ConversationMessageEntity[]> {
    const query = `
      SELECT m.* 
      FROM app.conversation_messages m
      WHERE m.conversation_id = $1 AND m.organization_id = $2
      ORDER BY m.created_at ASC
      LIMIT $3 OFFSET $4;
    `;

    const res = await this.db.query<ConversationMessageEntity>(query, [
      conversationId,
      organizationId,
      limit,
      offset,
    ]);

    return res.rows;
  }

  toSafeConversation(entity: ConversationEntity): SafeConversation {
    return {
      id: entity.id,
      organizationId: entity.organization_id,
      userId: entity.user_id,
      title: entity.title,
      threadId: entity.thread_id,
      status: entity.status,
      createdAt: entity.created_at.toISOString(),
      updatedAt: entity.updated_at.toISOString(),
      lastMessage: entity.last_message || null,
      messageCount: entity.message_count ? Number(entity.message_count) : 0,
    };
  }

  toSafeMessage(entity: ConversationMessageEntity): SafeConversationMessage {
    return {
      id: entity.id,
      conversationId: entity.conversation_id,
      organizationId: entity.organization_id,
      userId: entity.user_id,
      role: entity.role,
      content: entity.content,
      citations: Array.isArray(entity.citations) ? entity.citations : [],
      toolCalls: Array.isArray(entity.tool_calls) ? entity.tool_calls : [],
      actionProposals: Array.isArray(entity.action_proposals) ? entity.action_proposals : [],
      telemetry: typeof entity.telemetry === 'object' && entity.telemetry !== null ? entity.telemetry : {},
      status: entity.status,
      createdAt: entity.created_at.toISOString(),
    };
  }
}

export const conversationRepository = new ConversationRepository();
