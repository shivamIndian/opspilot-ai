import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../database/index.js';
import type {
  CommentVisibility,
  TicketCommentEntity,
  TicketCommentWithAuthorEntity,
  SafeTicketComment,
} from '../types/ticket.types.js';

export interface CreateCommentParams {
  organizationId: string;
  ticketId: string;
  authorUserId: string;
  body: string;
  visibility: CommentVisibility;
}

export class TicketCommentRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  /**
   * Inserts a new comment in the database.
   */
  async create(params: CreateCommentParams, client?: PoolClient): Promise<TicketCommentEntity> {
    const executor = client || this.db;
    const query = `
      INSERT INTO app.ticket_comments (
        organization_id,
        ticket_id,
        author_user_id,
        body,
        visibility
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const result = await executor.query(query, [
      params.organizationId,
      params.ticketId,
      params.authorUserId,
      params.body,
      params.visibility,
    ]);

    return result.rows[0];
  }

  /**
   * Retrieves comments for a ticket with author details.
   * Internal notes are included only if `includeInternal` is true.
   */
  async listByTicket(
    organizationId: string,
    ticketId: string,
    includeInternal: boolean,
    limit = 50,
    offset = 0
  ): Promise<{ comments: TicketCommentWithAuthorEntity[]; total: number }> {
    const visibilityFilter = includeInternal ? '' : "AND c.visibility = 'public'";

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM app.ticket_comments c
      WHERE c.organization_id = $1 AND c.ticket_id = $2 ${visibilityFilter};
    `;

    const dataQuery = `
      SELECT 
        c.*,
        u.name AS author_name,
        u.email AS author_email
      FROM app.ticket_comments c
      JOIN app.users u ON c.author_user_id = u.id
      WHERE c.organization_id = $1 AND c.ticket_id = $2 ${visibilityFilter}
      ORDER BY c.created_at ASC
      LIMIT $3 OFFSET $4;
    `;

    const [countRes, dataRes] = await Promise.all([
      this.db.query(countQuery, [organizationId, ticketId]),
      this.db.query(dataQuery, [organizationId, ticketId, limit, offset]),
    ]);

    return {
      total: countRes.rows[0]?.total || 0,
      comments: dataRes.rows,
    };
  }

  toSafeComment(comment: TicketCommentWithAuthorEntity): SafeTicketComment {
    return {
      id: comment.id,
      organizationId: comment.organization_id,
      ticketId: comment.ticket_id,
      authorUserId: comment.author_user_id,
      body: comment.body,
      visibility: comment.visibility,
      createdAt: comment.created_at.toISOString(),
      updatedAt: comment.updated_at ? comment.updated_at.toISOString() : null,
      author: {
        id: comment.author_user_id,
        name: comment.author_name || 'User',
        email: comment.author_email || '',
      },
    };
  }
}

export const ticketCommentRepository = new TicketCommentRepository();
