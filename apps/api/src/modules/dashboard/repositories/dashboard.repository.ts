import type { Pool } from 'pg';
import { pool } from '../../../database/index.js';
import { ticketCounterRepository } from '../../tickets/repositories/ticket-counter.repository.js';
import type {
  TicketDashboardMetrics,
  DocumentDashboardMetrics,
  ApprovalDashboardMetrics,
  DashboardRecentActivity,
  TicketTrendPoint,
  DashboardRecentTicket,
} from '../types/dashboard.types.js';

export class DashboardRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async getTicketMetrics(
    organizationId: string,
    fromDate?: Date | null,
    toDate?: Date | null
  ): Promise<{
    metrics: TicketDashboardMetrics;
    openTickets: number;
    unassignedTickets: number;
    urgentTickets: number;
  }> {
    // 1. Distribution and KPI counts
    const countsQuery = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE t.status = 'open')::int AS status_open,
        COUNT(*) FILTER (WHERE t.status = 'in_progress')::int AS status_in_progress,
        COUNT(*) FILTER (WHERE t.status = 'waiting_on_customer')::int AS status_waiting_on_customer,
        COUNT(*) FILTER (WHERE t.status = 'resolved')::int AS status_resolved,
        COUNT(*) FILTER (WHERE t.status = 'closed')::int AS status_closed,
        COUNT(*) FILTER (WHERE t.priority = 'urgent')::int AS priority_urgent,
        COUNT(*) FILTER (WHERE t.priority = 'high')::int AS priority_high,
        COUNT(*) FILTER (WHERE t.priority = 'medium')::int AS priority_medium,
        COUNT(*) FILTER (WHERE t.priority = 'low')::int AS priority_low,
        COUNT(*) FILTER (WHERE t.status IN ('open', 'in_progress', 'waiting_on_customer') AND t.assigned_to_user_id IS NULL)::int AS unassigned_count
      FROM app.tickets t
      WHERE t.organization_id = $1 AND t.archived_at IS NULL
        AND ($2::timestamptz IS NULL OR t.created_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR t.created_at <= $3::timestamptz);
    `;

    const countsRes = await this.db.query(countsQuery, [
      organizationId,
      fromDate || null,
      toDate || null,
    ]);
    const row = countsRes.rows[0] || {};

    const openCount = (row.status_open || 0) + (row.status_in_progress || 0) + (row.status_waiting_on_customer || 0);

    // 2. Trend points (daily series)
    const trendQuery = `
      SELECT 
        TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
        COUNT(DISTINCT t_created.id)::int AS created,
        COUNT(DISTINCT t_resolved.id)::int AS resolved
      FROM generate_series(
        COALESCE($2::date, CURRENT_DATE - INTERVAL '29 days')::timestamp,
        COALESCE($3::date, CURRENT_DATE)::timestamp,
        INTERVAL '1 day'
      ) AS d(day)
      LEFT JOIN app.tickets t_created 
        ON t_created.organization_id = $1 
        AND t_created.archived_at IS NULL
        AND t_created.created_at::date = d.day::date
      LEFT JOIN app.tickets t_resolved 
        ON t_resolved.organization_id = $1 
        AND t_resolved.archived_at IS NULL
        AND t_resolved.resolved_at::date = d.day::date
      GROUP BY d.day
      ORDER BY d.day ASC;
    `;

    const trendRes = await this.db.query(trendQuery, [
      organizationId,
      fromDate || null,
      toDate || null,
    ]);

    const volumeTrend: TicketTrendPoint[] = trendRes.rows.map((r) => ({
      date: r.date,
      created: Number(r.created) || 0,
      resolved: Number(r.resolved) || 0,
    }));

    // 3. Top 5 recent tickets
    const recentQuery = `
      SELECT 
        t.id,
        t.ticket_number,
        t.subject,
        t.priority,
        t.status,
        t.created_at,
        creator.name AS creator_name,
        assignee.name AS assignee_name
      FROM app.tickets t
      JOIN app.users creator ON t.created_by_user_id = creator.id
      LEFT JOIN app.users assignee ON t.assigned_to_user_id = assignee.id
      WHERE t.organization_id = $1 AND t.archived_at IS NULL
      ORDER BY t.created_at DESC
      LIMIT 5;
    `;

    const recentRes = await this.db.query(recentQuery, [organizationId]);
    const recentTickets: DashboardRecentTicket[] = recentRes.rows.map((r) => {
      const num = parseInt(String(r.ticket_number), 10);
      return {
        id: r.id,
        ticketNumber: num,
        formattedTicketNumber: ticketCounterRepository.formatTicketNumber(num),
        subject: r.subject,
        priority: r.priority,
        status: r.status,
        creatorName: r.creator_name || 'Unknown',
        assigneeName: r.assignee_name || null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      };
    });

    const metrics: TicketDashboardMetrics = {
      total: row.total || 0,
      statusDistribution: {
        open: row.status_open || 0,
        in_progress: row.status_in_progress || 0,
        waiting_on_customer: row.status_waiting_on_customer || 0,
        resolved: row.status_resolved || 0,
        closed: row.status_closed || 0,
      },
      priorityDistribution: {
        urgent: row.priority_urgent || 0,
        high: row.priority_high || 0,
        medium: row.priority_medium || 0,
        low: row.priority_low || 0,
      },
      volumeTrend,
      recentTickets,
    };

    return {
      metrics,
      openTickets: openCount,
      unassignedTickets: row.unassigned_count || 0,
      urgentTickets: row.priority_urgent || 0,
    };
  }

  async getDocumentMetrics(organizationId: string): Promise<DocumentDashboardMetrics> {
    const query = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
        COUNT(*) FILTER (WHERE processing_status = 'pending')::int AS proc_pending,
        COUNT(*) FILTER (WHERE processing_status = 'queued')::int AS proc_queued,
        COUNT(*) FILTER (WHERE processing_status = 'processing')::int AS proc_processing,
        COUNT(*) FILTER (WHERE processing_status = 'completed')::int AS proc_completed,
        COUNT(*) FILTER (WHERE processing_status = 'failed')::int AS proc_failed,
        COUNT(*) FILTER (WHERE embedding_status = 'pending')::int AS emb_pending,
        COUNT(*) FILTER (WHERE embedding_status = 'queued')::int AS emb_queued,
        COUNT(*) FILTER (WHERE embedding_status = 'processing')::int AS emb_processing,
        COUNT(*) FILTER (WHERE embedding_status = 'completed')::int AS emb_completed,
        COUNT(*) FILTER (WHERE embedding_status = 'failed')::int AS emb_failed,
        COUNT(*) FILTER (WHERE embedding_status = 'skipped')::int AS emb_skipped,
        COALESCE(SUM(chunk_count), 0)::int AS total_chunks,
        COALESCE(SUM(embedded_chunk_count), 0)::int AS embedded_chunks
      FROM app.documents
      WHERE organization_id = $1;
    `;

    const res = await this.db.query(query, [organizationId]);
    const row = res.rows[0] || {};

    return {
      total: row.total || 0,
      active: row.active || 0,
      archived: row.archived || 0,
      processingStatus: {
        pending: row.proc_pending || 0,
        queued: row.proc_queued || 0,
        processing: row.proc_processing || 0,
        completed: row.proc_completed || 0,
        failed: row.proc_failed || 0,
      },
      embeddingStatus: {
        pending: row.emb_pending || 0,
        queued: row.emb_queued || 0,
        processing: row.emb_processing || 0,
        completed: row.emb_completed || 0,
        failed: row.emb_failed || 0,
        skipped: row.emb_skipped || 0,
      },
      totalChunks: row.total_chunks || 0,
      embeddedChunks: row.embedded_chunks || 0,
    };
  }

  async getApprovalMetrics(
    organizationId: string,
    fromDate?: Date | null,
    toDate?: Date | null
  ): Promise<ApprovalDashboardMetrics> {
    const countsQuery = `
      SELECT 
        COUNT(*)::int AS total_proposals,
        COUNT(*) FILTER (WHERE status = 'awaiting_approval')::int AS awaiting_approval,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE status = 'executed')::int AS executed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM app.agent_action_proposals
      WHERE organization_id = $1
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz);
    `;

    const countsRes = await this.db.query(countsQuery, [
      organizationId,
      fromDate || null,
      toDate || null,
    ]);
    const row = countsRes.rows[0] || {};

    const recentPendingQuery = `
      SELECT 
        id, tool_name, action_type, risk_level, created_at, expires_at
      FROM app.agent_action_proposals
      WHERE organization_id = $1 AND status = 'awaiting_approval'
      ORDER BY created_at DESC
      LIMIT 5;
    `;

    const recentPendingRes = await this.db.query(recentPendingQuery, [organizationId]);
    const recentPending = recentPendingRes.rows.map((r) => ({
      id: r.id,
      toolName: r.tool_name,
      actionType: r.action_type,
      riskLevel: r.risk_level,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
    }));

    return {
      pendingCount: row.awaiting_approval || 0,
      totalProposals: row.total_proposals || 0,
      statusDistribution: {
        awaiting_approval: row.awaiting_approval || 0,
        approved: row.approved || 0,
        rejected: row.rejected || 0,
        executed: row.executed || 0,
        failed: row.failed || 0,
        cancelled: row.cancelled || 0,
      },
      recentPending,
    };
  }

  async getRecentActivity(
    organizationId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<DashboardRecentActivity[]> {
    const query = `
      SELECT 
        al.id,
        al.action,
        al.target_type,
        al.target_id,
        al.metadata,
        al.created_at,
        COALESCE(u.name, 'System') AS actor_name,
        COALESCE(u.email, 'system@opspilot.internal') AS actor_email
      FROM app.organization_audit_logs al
      LEFT JOIN app.users u ON al.actor_user_id = u.id
      WHERE al.organization_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const res = await this.db.query(query, [organizationId, limit, offset]);
    return res.rows.map((r) => ({
      id: r.id,
      action: r.action,
      actorName: r.actor_name,
      actorEmail: r.actor_email,
      targetType: r.target_type,
      targetId: r.target_id,
      metadata: r.metadata || {},
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  }
}

export const dashboardRepository = new DashboardRepository();
