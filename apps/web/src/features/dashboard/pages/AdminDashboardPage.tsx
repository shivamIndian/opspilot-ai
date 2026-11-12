import React, { useState } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import {
  Ticket,
  ShieldCheck,
  FileText,
  Workflow,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import type { SafeOrganization } from '@/types/organization';
import type { DashboardPeriodKey } from '../types/dashboard.types';
import { useDashboardOverview } from '../hooks/useDashboardData';
import { DashboardHeader } from '../components/DashboardHeader';
import { MetricCard } from '../components/MetricCard';
import { TicketAnalyticsCharts } from '../components/TicketAnalyticsCharts';
import { KnowledgeBaseOverview } from '../components/KnowledgeBaseOverview';
import { AgentActivityOverview } from '../components/AgentActivityOverview';
import { ApprovalSummaryWidget } from '../components/ApprovalSummaryWidget';
import { RecentTicketsTable } from '../components/RecentTicketsTable';
import { RecentActivityFeed } from '../components/RecentActivityFeed';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

export const AdminDashboardPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const context = useOutletContext<{ organization?: SafeOrganization }>();
  const organization = context?.organization;

  const [period, setPeriod] = useState<DashboardPeriodKey>('30d');

  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } =
    useDashboardOverview(organizationId, period);

  // Authorization Guard: Only Organization Owners & Admins
  const isOwner = organization?.role === 'owner';
  const isAdmin = organization?.role === 'admin' || isOwner;

  if (organization && !isAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-red-900 dark:text-red-200">
          Access Restricted: Administrator Privileges Required
        </h2>
        <p className="mt-1 text-sm text-red-700 dark:text-red-400 max-w-md mx-auto">
          The Operations & AI Admin Dashboard contains sensitive organization metrics, audit logs, and governance workflows. Only organization owners and administrators are permitted access.
        </p>
        <div className="mt-5">
          <Link
            to={`/organizations/${organization.id}`}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--surface-primary)] border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] shadow-sm"
          >
            Return to Workspace Overview
          </Link>
        </div>
      </div>
    );
  }

  const formatDuration = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header with Title, Period Switcher, and Refresh */}
      <DashboardHeader
        organizationName={organization?.name || 'Organization'}
        role={organization?.role || 'admin'}
        period={period}
        onPeriodChange={(newPeriod) => setPeriod(newPeriod)}
        onRefresh={() => refetch()}
        isFetching={isFetching}
        lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined}
      />

      {/* Error Banner */}
      {isError && (
        <Alert variant="error" title="Failed to load dashboard metrics">
          <div className="flex items-center justify-between">
            <span>
              {error instanceof Error ? error.message : 'An unexpected error occurred while fetching operational metrics.'}
            </span>
            <Button size="sm" variant="secondary" onClick={() => refetch()} className="ml-4">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Try Again
            </Button>
          </div>
        </Alert>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Support Tickets"
          value={data?.kpis.openTickets ?? 0}
          subtitle={`${data?.tickets.statusDistribution.open ?? 0} open, ${data?.tickets.statusDistribution.in_progress ?? 0} in progress`}
          icon={Ticket}
          loading={isLoading}
          accentColor="#3b82f6"
          badge={
            data && data.kpis.urgentTickets > 0
              ? { text: `${data.kpis.urgentTickets} urgent`, variant: 'danger' }
              : undefined
          }
        />

        <MetricCard
          title="Pending Approvals"
          value={data?.kpis.pendingApprovals ?? 0}
          subtitle="Human-in-the-loop governance gating"
          icon={ShieldCheck}
          loading={isLoading}
          accentColor="#f59e0b"
          badge={
            data && data.kpis.pendingApprovals > 0
              ? { text: 'Action required', variant: 'warning' }
              : { text: 'Up to date', variant: 'success' }
          }
        />

        <MetricCard
          title="Active Documents (RAG)"
          value={data?.kpis.activeDocuments ?? 0}
          subtitle={`${data?.documents.totalChunks ?? 0} chunks searchable`}
          icon={FileText}
          loading={isLoading}
          accentColor="#10b981"
          badge={
            data && data.documents.processingStatus.failed > 0
              ? { text: `${data.documents.processingStatus.failed} failed`, variant: 'danger' }
              : undefined
          }
        />

        <MetricCard
          title="AI Workflow Runs"
          value={data?.kpis.aiWorkflowsTotal ?? 0}
          subtitle={`${data?.kpis.aiSuccessRate ?? 0}% success • ${formatDuration(data?.kpis.avgWorkflowDurationMs ?? 0)} avg`}
          icon={Workflow}
          loading={isLoading}
          accentColor="#8b5cf6"
          trend={
            data
              ? {
                  value: `${data.aiActivity.successful_runs} successful`,
                  positive: data.kpis.aiSuccessRate >= 80,
                }
              : undefined
          }
        />
      </div>

      {/* Primary Operations Visualizations (Two Columns on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data && organizationId ? (
          <>
            <TicketAnalyticsCharts organizationId={organizationId} data={data.tickets} />
            <AgentActivityOverview organizationId={organizationId} data={data.aiActivity} />
          </>
        ) : (
          <>
            <div className="h-64 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] animate-pulse" />
            <div className="h-64 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] animate-pulse" />
          </>
        )}
      </div>

      {/* Secondary Operations Status (Knowledge Base & Approvals) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data && organizationId ? (
          <>
            <KnowledgeBaseOverview organizationId={organizationId} data={data.documents} />
            <ApprovalSummaryWidget organizationId={organizationId} data={data.approvals} />
          </>
        ) : (
          <>
            <div className="h-48 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] animate-pulse" />
            <div className="h-48 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] animate-pulse" />
          </>
        )}
      </div>

      {/* Recent Activity & Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data && organizationId ? (
          <>
            <RecentTicketsTable organizationId={organizationId} tickets={data.tickets.recentTickets} />
            <RecentActivityFeed activity={data.recentActivity} />
          </>
        ) : (
          <>
            <div className="h-48 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] animate-pulse" />
            <div className="h-48 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] animate-pulse" />
          </>
        )}
      </div>
    </div>
  );
};
