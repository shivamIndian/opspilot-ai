import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../database/index.js';
import { ticketCounterRepository } from './ticket-counter.repository.js';
import type { OrganizationRole } from '../../organizations/types/organization.types.js';
import type {
  TicketEntity,
  TicketWithUsersEntity,
  SafeTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketFilterParams,
  TicketSummaryMetrics,
} from '../types/ticket.types.js';

export interface CreateTicketParams {
  organizationId: string;
  ticketNumber: number;
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  createdByUserId: string;
}

export class TicketRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findById(
    organizationId: string,
    ticketId: string,
    client?: PoolClient
  ): Promise<TicketWithUsersEntity | null> {
    const executor = client || this.db;
    const query = `
      SELECT 
        t.*,
        creator.name AS creator_name,
        creator.email AS creator_email,
        assignee.name AS assignee_name,
        assignee.email AS assignee_email
      FROM app.tickets t
      JOIN app.users creator ON t.created_by_user_id = creator.id
      LEFT JOIN app.users assignee ON t.assigned_to_user_id = assignee.id
      WHERE t.organization_id = $1 AND t.id = $2;
    `;

    const result = await executor.query(query, [organizationId, ticketId]);
    return result.rows[0] || null;
  }

  async findByIdForUpdate(
    organizationId: string,
    ticketId: string,
    client: PoolClient
  ): Promise<TicketEntity | null> {
    const query = `
      SELECT * FROM app.tickets
      WHERE organization_id = $1 AND id = $2
      FOR UPDATE;
    `;

    const result = await client.query(query, [organizationId, ticketId]);
    return result.rows[0] || null;
  }

  async create(params: CreateTicketParams, client?: PoolClient): Promise<TicketEntity> {
    const executor = client || this.db;
    const query = `
      INSERT INTO app.tickets (
        organization_id,
        ticket_number,
        subject,
        description,
        category,
        priority,
        status,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)
      RETURNING *;
    `;

    const result = await executor.query(query, [
      params.organizationId,
      params.ticketNumber,
      params.subject,
      params.description,
      params.category,
      params.priority || 'medium',
      params.createdByUserId,
    ]);

    return result.rows[0];
  }

  async updateDetails(
    organizationId: string,
    ticketId: string,
    fields: { subject?: string; description?: string; category?: TicketCategory },
    client?: PoolClient
  ): Promise<TicketEntity> {
    const executor = client || this.db;
    const updates: string[] = [];
    const values: unknown[] = [organizationId, ticketId];
    let idx = 3;

    if (fields.subject !== undefined) {
      updates.push(`subject = $${idx++}`);
      values.push(fields.subject);
    }
    if (fields.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(fields.description);
    }
    if (fields.category !== undefined) {
      updates.push(`category = $${idx++}`);
      values.push(fields.category);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE app.tickets
      SET ${updates.join(', ')}
      WHERE organization_id = $1 AND id = $2
      RETURNING *;
    `;

    const result = await executor.query(query, values);
    return result.rows[0];
  }

  async updateAssignment(
    organizationId: string,
    ticketId: string,
    assignedToUserId: string | null,
    client?: PoolClient
  ): Promise<TicketEntity> {
    const executor = client || this.db;
    const query = `
      UPDATE app.tickets
      SET assigned_to_user_id = $3, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 AND id = $2
      RETURNING *;
    `;

    const result = await executor.query(query, [organizationId, ticketId, assignedToUserId]);
    return result.rows[0];
  }

  async updatePriority(
    organizationId: string,
    ticketId: string,
    priority: TicketPriority,
    client?: PoolClient
  ): Promise<TicketEntity> {
    const executor = client || this.db;
    const query = `
      UPDATE app.tickets
      SET priority = $3, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 AND id = $2
      RETURNING *;
    `;

    const result = await executor.query(query, [organizationId, ticketId, priority]);
    return result.rows[0];
  }

  async updateStatus(
    organizationId: string,
    ticketId: string,
    status: TicketStatus,
    resolvedAt: Date | null,
    closedAt: Date | null,
    client?: PoolClient
  ): Promise<TicketEntity> {
    const executor = client || this.db;
    const query = `
      UPDATE app.tickets
      SET 
        status = $3,
        resolved_at = $4,
        closed_at = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 AND id = $2
      RETURNING *;
    `;

    const result = await executor.query(query, [
      organizationId,
      ticketId,
      status,
      resolvedAt,
      closedAt,
    ]);
    return result.rows[0];
  }

  async archive(
    organizationId: string,
    ticketId: string,
    client?: PoolClient
  ): Promise<TicketEntity> {
    const executor = client || this.db;
    const query = `
      UPDATE app.tickets
      SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 AND id = $2
      RETURNING *;
    `;

    const result = await executor.query(query, [organizationId, ticketId]);
    return result.rows[0];
  }

  async list(
    organizationId: string,
    params: TicketFilterParams,
    actorRole: OrganizationRole,
    actorUserId: string
  ): Promise<{ tickets: TicketWithUsersEntity[]; total: number }> {
    const conditions: string[] = ['t.organization_id = $1'];
    const values: unknown[] = [organizationId];
    let idx = 2;

    // Role-based visibility enforcement inside the database query
    if (actorRole !== 'owner' && actorRole !== 'admin') {
      conditions.push(`(t.created_by_user_id = $${idx} OR t.assigned_to_user_id = $${idx})`);
      values.push(actorUserId);
      idx++;
    }

    // Archival filter: default hide archived tickets
    if (params.archived) {
      conditions.push('t.archived_at IS NOT NULL');
    } else {
      conditions.push('t.archived_at IS NULL');
    }

    if (params.status) {
      conditions.push(`t.status = $${idx++}`);
      values.push(params.status);
    }

    if (params.priority) {
      conditions.push(`t.priority = $${idx++}`);
      values.push(params.priority);
    }

    if (params.category) {
      conditions.push(`t.category = $${idx++}`);
      values.push(params.category);
    }

    if (params.assignedTo) {
      conditions.push(`t.assigned_to_user_id = $${idx++}`);
      values.push(params.assignedTo);
    }

    if (params.createdBy) {
      conditions.push(`t.created_by_user_id = $${idx++}`);
      values.push(params.createdBy);
    }

    if (params.dateFrom) {
      conditions.push(`t.created_at >= $${idx++}`);
      values.push(new Date(params.dateFrom));
    }

    if (params.dateTo) {
      conditions.push(`t.created_at <= $${idx++}`);
      values.push(new Date(params.dateTo));
    }

    if (params.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(
        `(t.subject ILIKE $${idx} OR t.description ILIKE $${idx} OR CAST(t.ticket_number AS TEXT) ILIKE $${idx})`
      );
      values.push(searchPattern);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM app.tickets t
      WHERE ${whereClause};
    `;

    // Sorting
    const sortFieldMap: Record<string, string> = {
      created_at: 't.created_at',
      updated_at: 't.updated_at',
      ticket_number: 't.ticket_number',
      priority: 't.priority',
      status: 't.status',
    };
    const sortColumn = sortFieldMap[params.sortBy || 'created_at'] || 't.created_at';
    const sortDirection = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT 
        t.*,
        creator.name AS creator_name,
        creator.email AS creator_email,
        assignee.name AS assignee_name,
        assignee.email AS assignee_email
      FROM app.tickets t
      JOIN app.users creator ON t.created_by_user_id = creator.id
      LEFT JOIN app.users assignee ON t.assigned_to_user_id = assignee.id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    const dataValues = [...values, limit, offset];

    const [countRes, dataRes] = await Promise.all([
      this.db.query(countQuery, values),
      this.db.query(dataQuery, dataValues),
    ]);

    return {
      total: countRes.rows[0]?.total || 0,
      tickets: dataRes.rows,
    };
  }

  async getSummaryMetrics(
    organizationId: string,
    actorRole: OrganizationRole,
    actorUserId: string
  ): Promise<TicketSummaryMetrics> {
    const conditions: string[] = ['t.organization_id = $1', 't.archived_at IS NULL'];
    const values: unknown[] = [organizationId];

    if (actorRole !== 'owner' && actorRole !== 'admin') {
      conditions.push('(t.created_by_user_id = $2 OR t.assigned_to_user_id = $2)');
      values.push(actorUserId);
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE t.status = 'open')::int AS open,
        COUNT(*) FILTER (WHERE t.status = 'in_progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE t.status = 'waiting_on_customer')::int AS waiting_on_customer,
        COUNT(*) FILTER (WHERE t.status = 'resolved')::int AS resolved,
        COUNT(*) FILTER (WHERE t.status = 'closed')::int AS closed,
        COUNT(*) FILTER (WHERE t.priority = 'urgent')::int AS urgent,
        COUNT(*) FILTER (WHERE t.priority = 'high')::int AS high
      FROM app.tickets t
      WHERE ${whereClause};
    `;

    const result = await this.db.query(query, values);
    const row = result.rows[0] || {};

    return {
      total: row.total || 0,
      open: row.open || 0,
      inProgress: row.in_progress || 0,
      waitingOnCustomer: row.waiting_on_customer || 0,
      resolved: row.resolved || 0,
      closed: row.closed || 0,
      urgent: row.urgent || 0,
      high: row.high || 0,
    };
  }

  toSafeTicket(ticket: TicketWithUsersEntity): SafeTicket {
    const num = parseInt(String(ticket.ticket_number), 10);
    return {
      id: ticket.id,
      organizationId: ticket.organization_id,
      ticketNumber: num,
      formattedTicketNumber: ticketCounterRepository.formatTicketNumber(num),
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdByUserId: ticket.created_by_user_id,
      assignedToUserId: ticket.assigned_to_user_id,
      resolvedAt: ticket.resolved_at ? ticket.resolved_at.toISOString() : null,
      closedAt: ticket.closed_at ? ticket.closed_at.toISOString() : null,
      archivedAt: ticket.archived_at ? ticket.archived_at.toISOString() : null,
      createdAt: ticket.created_at.toISOString(),
      updatedAt: ticket.updated_at.toISOString(),
      creator: ticket.creator_name
        ? {
            id: ticket.created_by_user_id,
            name: ticket.creator_name,
            email: ticket.creator_email || '',
          }
        : undefined,
      assignee: ticket.assigned_to_user_id
        ? {
            id: ticket.assigned_to_user_id,
            name: ticket.assignee_name || 'Assigned User',
            email: ticket.assignee_email || '',
          }
        : null,
    };
  }
}

export const ticketRepository = new TicketRepository();
