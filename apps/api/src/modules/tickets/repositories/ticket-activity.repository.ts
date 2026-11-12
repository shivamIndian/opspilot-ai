import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../database/index.js';
import type {
  TicketAction,
  TicketActivityLogEntity,
  TicketActivityLogWithActorEntity,
  SafeTicketActivityLog,
} from '../types/ticket.types.js';

export interface CreateActivityLogParams {
  organizationId: string;
  ticketId: string;
  actorUserId: string | null;
  action: TicketAction;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export class TicketActivityRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  /**
   * Appends an immutable activity log inside an optional transaction client.
   */
  async logActivity(
    params: CreateActivityLogParams,
    client?: PoolClient
  ): Promise<TicketActivityLogEntity> {
    const executor = client || this.db;
    const query = `
      INSERT INTO app.ticket_activity_logs (
        organization_id,
        ticket_id,
        actor_user_id,
        action,
        old_values,
        new_values,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const result = await executor.query(query, [
      params.organizationId,
      params.ticketId,
      params.actorUserId,
      params.action,
      params.oldValues ? JSON.stringify(params.oldValues) : null,
      params.newValues ? JSON.stringify(params.newValues) : null,
      JSON.stringify(params.metadata || {}),
    ]);

    return result.rows[0];
  }

  /**
   * Retrieves paginated activity logs for a ticket, with actor name and email joined.
   */
  async listByTicket(
    organizationId: string,
    ticketId: string,
    limit = 50,
    offset = 0
  ): Promise<{ logs: TicketActivityLogWithActorEntity[]; total: number }> {
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM app.ticket_activity_logs
      WHERE organization_id = $1 AND ticket_id = $2;
    `;

    const dataQuery = `
      SELECT 
        l.*,
        u.name AS actor_name,
        u.email AS actor_email
      FROM app.ticket_activity_logs l
      LEFT JOIN app.users u ON l.actor_user_id = u.id
      WHERE l.organization_id = $1 AND l.ticket_id = $2
      ORDER BY l.created_at ASC
      LIMIT $3 OFFSET $4;
    `;

    const [countRes, dataRes] = await Promise.all([
      this.db.query(countQuery, [organizationId, ticketId]),
      this.db.query(dataQuery, [organizationId, ticketId, limit, offset]),
    ]);

    return {
      total: countRes.rows[0]?.total || 0,
      logs: dataRes.rows,
    };
  }

  toSafeActivityLog(log: TicketActivityLogWithActorEntity): SafeTicketActivityLog {
    return {
      id: log.id,
      organizationId: log.organization_id,
      ticketId: log.ticket_id,
      actorUserId: log.actor_user_id,
      action: log.action,
      oldValues: log.old_values,
      newValues: log.new_values,
      metadata: log.metadata || {},
      createdAt: log.created_at.toISOString(),
      actor: log.actor_user_id
        ? {
            id: log.actor_user_id,
            name: log.actor_name || 'Unknown User',
            email: log.actor_email || '',
          }
        : null,
    };
  }
}

export const ticketActivityRepository = new TicketActivityRepository();
