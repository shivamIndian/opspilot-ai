import React from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ExternalLink,
  ShieldAlert,
  Clock,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { WorkflowRunItem } from '../types/agent-monitoring.types';

interface WorkflowRunsTableProps {
  runs: WorkflowRunItem[];
  organizationId: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  selectedStatus: string;
  searchQuery: string;
  isLoading: boolean;
  onStatusChange: (status: string) => void;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
}

export const WorkflowRunsTable: React.FC<WorkflowRunsTableProps> = ({
  runs,
  organizationId,
  total,
  page,
  totalPages,
  selectedStatus,
  searchQuery,
  isLoading,
  onStatusChange,
  onSearchChange,
  onPageChange,
}) => {
  const statusTabs = [
    { id: 'all', label: 'All Workflows' },
    { id: 'completed', label: 'Completed' },
    { id: 'waiting_approval', label: 'Awaiting Approval' },
    { id: 'failed', label: 'Failed' },
    { id: 'running', label: 'Running / Queued' },
  ];

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'waiting_approval':
      case 'awaiting_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <ShieldAlert className="w-3 h-3" /> Awaiting Approval
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'running':
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-pulse">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden space-y-4 p-5">
      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onStatusChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedStatus === tab.id
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search intent, tool, or thread..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <th className="py-3 px-4">Run ID / Thread</th>
              <th className="py-3 px-4">Intent & Action</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Tool Invocations</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading workflow telemetry...</span>
                  </div>
                </td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  No agent workflow executions match the selected filter.
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr
                  key={run.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                    <Link
                      to={`/organizations/${organizationId}/agent-monitoring/runs/${run.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {run.id.slice(0, 8)}...
                    </Link>
                    <span className="block text-[11px] text-slate-400 font-normal">
                      thread: {run.thread_id.slice(0, 10)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                      {run.intent ? run.intent.replace(/_/g, ' ') : 'General Support'}
                    </div>
                    {run.selected_tool && (
                      <span className="inline-block mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {run.selected_tool}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">{renderStatusBadge(run.status)}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-400" />
                      <span>{run.tool_call_count} call(s)</span>
                      <span className="text-[11px] text-slate-400">
                        ({run.completed_steps_count}/{run.total_steps || 1} steps)
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {run.duration_ms
                      ? `${(run.duration_ms / 1000).toFixed(2)}s`
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {run.created_at ? new Date(run.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    {run.proposal_id && (
                      <Link
                        to={`/organizations/${organizationId}/approvals/${run.proposal_id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 transition"
                      >
                        <ShieldAlert className="w-3 h-3" /> Review Proposal
                      </Link>
                    )}
                    <Link
                      to={`/organizations/${organizationId}/agent-monitoring/runs/${run.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      Inspect <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
        <span>
          Showing {runs.length} of {total} workflow runs
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
