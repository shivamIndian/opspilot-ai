import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import {
  useMonitoringOverview,
  useWorkflowRuns,
  useToolExecutions,
} from '../hooks/useAgentMonitoring';
import { MonitoringOverviewCards } from '../components/MonitoringOverviewCards';
import { WorkflowRunsTable } from '../components/WorkflowRunsTable';
import { ToolExecutionSummary } from '../components/ToolExecutionSummary';

export const AgentMonitoringPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { activeOrganization } = useOrganizations();
  const currentOrgId = organizationId || activeOrganization?.id;

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const {
    data: overview,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useMonitoringOverview(currentOrgId);

  const {
    data: runsResult,
    isLoading: isRunsLoading,
    refetch: refetchRuns,
  } = useWorkflowRuns(currentOrgId, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchQuery.trim() || undefined,
    page,
    limit: 15,
  });

  const {
    data: toolMetrics,
    isLoading: isToolsLoading,
    refetch: refetchTools,
  } = useToolExecutions(currentOrgId);

  const handleRefresh = async () => {
    await Promise.all([refetchOverview(), refetchRuns(), refetchTools()]);
  };

  if (!currentOrgId) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        Please select an active organization to monitor agent workflows.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            AI Agent Observability & Workflow Monitoring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time execution telemetry, tool invocation monitoring, and human-in-the-loop lifecycle tracking.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isOverviewLoading || isRunsLoading ? 'animate-spin' : ''}`} />
          Refresh Telemetry
        </button>
      </div>

      {/* KPI Overview Cards */}
      <MonitoringOverviewCards overview={overview} isLoading={isOverviewLoading} />

      {/* Main Content Grid: Runs Table + Tool Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WorkflowRunsTable
            runs={runsResult?.items || []}
            organizationId={currentOrgId}
            total={runsResult?.total || 0}
            page={page}
            limit={15}
            totalPages={runsResult?.totalPages || 1}
            selectedStatus={statusFilter}
            searchQuery={searchQuery}
            isLoading={isRunsLoading}
            onStatusChange={(st) => {
              setStatusFilter(st);
              setPage(1);
            }}
            onSearchChange={(sq) => {
              setSearchQuery(sq);
              setPage(1);
            }}
            onPageChange={(p) => setPage(p)}
          />
        </div>

        <div className="space-y-6">
          <ToolExecutionSummary tools={toolMetrics || []} isLoading={isToolsLoading} />
        </div>
      </div>
    </div>
  );
};
