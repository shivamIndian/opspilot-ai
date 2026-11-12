import { dashboardRepository, DashboardRepository } from '../repositories/dashboard.repository.js';
import { aiWorkflowClient, AiWorkflowClient } from '../../agent-workflows/client/ai-workflow.client.js';
import type {
  DashboardOverviewData,
  DashboardPeriodKey,
  DashboardRecentActivity,
} from '../types/dashboard.types.js';

export interface GetOverviewOptions {
  organizationId: string;
  period?: string;
  from?: string;
  to?: string;
}

export class DashboardService {
  constructor(
    private repo: DashboardRepository = dashboardRepository,
    private aiClient: AiWorkflowClient = aiWorkflowClient
  ) {}

  private resolveDateRange(period?: string, from?: string, to?: string): {
    key: DashboardPeriodKey;
    fromDate: Date;
    toDate: Date;
  } {
    const toDate = to ? new Date(to) : new Date();
    let fromDate: Date;
    let key: DashboardPeriodKey = '30d';

    if (period === '7d') {
      key = '7d';
      fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '90d') {
      key = '90d';
      fromDate = new Date(toDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === 'custom' && from) {
      key = 'custom';
      fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        key = '30d';
      }
    } else {
      key = '30d';
      fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { key, fromDate, toDate };
  }

  async getDashboardOverview(options: GetOverviewOptions): Promise<DashboardOverviewData> {
    const { organizationId, period, from, to } = options;
    const { key, fromDate, toDate } = this.resolveDateRange(period, from, to);

    const [
      ticketData,
      documentMetrics,
      approvalMetrics,
      aiMetrics,
      recentActivity,
    ] = await Promise.all([
      this.repo.getTicketMetrics(organizationId, fromDate, toDate),
      this.repo.getDocumentMetrics(organizationId),
      this.repo.getApprovalMetrics(organizationId, fromDate, toDate),
      this.aiClient.getWorkflowAnalytics(organizationId, fromDate.toISOString(), toDate.toISOString()),
      this.repo.getRecentActivity(organizationId, 10, 0),
    ]);

    const kpis = {
      openTickets: ticketData.openTickets,
      unassignedTickets: ticketData.unassignedTickets,
      urgentTickets: ticketData.urgentTickets,
      pendingApprovals: approvalMetrics.pendingCount,
      activeDocuments: documentMetrics.active,
      aiWorkflowsTotal: aiMetrics.total_runs,
      aiSuccessRate: aiMetrics.success_rate,
      avgWorkflowDurationMs: aiMetrics.avg_duration_ms,
    };

    return {
      period: {
        key,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
      },
      kpis,
      tickets: ticketData.metrics,
      documents: documentMetrics,
      aiActivity: aiMetrics,
      approvals: approvalMetrics,
      recentActivity,
    };
  }

  async getRecentActivityFeed(
    organizationId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<DashboardRecentActivity[]> {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeOffset = Math.max(0, offset);
    return this.repo.getRecentActivity(organizationId, safeLimit, safeOffset);
  }
}

export const dashboardService = new DashboardService();
