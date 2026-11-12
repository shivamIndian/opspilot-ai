import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  ShieldAlert,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  useWorkflowRunDetails,
  useWorkflowRunEvents,
} from '../hooks/useAgentMonitoring';
import { WorkflowTimeline } from '../components/WorkflowTimeline';

export const WorkflowRunDetailPage: React.FC = () => {
  const { organizationId, runId } = useParams<{
    organizationId: string;
    runId: string;
  }>();

  const {
    data: run,
    isLoading: isDetailsLoading,
    error: detailsError,
  } = useWorkflowRunDetails(organizationId, runId);

  const {
    data: events,
    isLoading: isEventsLoading,
  } = useWorkflowRunEvents(organizationId, runId);

  if (isDetailsLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-xs text-slate-500 animate-pulse">
          Loading workflow execution telemetry...
        </p>
      </div>
    );
  }

  if (detailsError || !run) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200">
          <h3 className="font-bold text-sm">Failed to load workflow run</h3>
          <p className="text-xs mt-1">
            {detailsError instanceof Error ? detailsError.message : 'Workflow run record not found'}
          </p>
        </div>
        <Link
          to={`/organizations/${organizationId}/agent-monitoring`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Agent Monitoring
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link
          to={`/organizations/${organizationId}/agent-monitoring`}
          className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Agent Monitoring
        </Link>
        <span>/</span>
        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
          {run.run_id}
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                {run.status.replace(/_/g, ' ')}
              </span>
              {run.requires_approval && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  <ShieldAlert className="w-3.5 h-3.5" /> Requires Human Authorization
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 capitalize">
              {run.intent ? run.intent.replace(/_/g, ' ') : 'Support Operational Workflow'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Thread: {run.thread_id} | Run: {run.run_id}
            </p>
          </div>

          {run.proposal_id && (
            <Link
              to={`/organizations/${organizationId}/approvals/${run.proposal_id}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
            >
              <ShieldAlert className="w-4 h-4" /> Review Action Proposal
            </Link>
          )}
        </div>

        {/* Telemetry Stat Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Duration</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
              {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(2)}s` : 'In flight'}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Execution Steps</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
              {run.completed_steps?.length || 1} / {run.total_steps || 1}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Tool Invoked</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm truncate block">
              {run.selected_tool || 'None'}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Citations Found</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
              {run.citations?.length || 0} reference(s)
            </span>
          </div>
        </div>
      </div>

      {/* Execution Summary or Warning */}
      {run.execution_summary && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <span className="font-bold uppercase tracking-wider text-[10px] text-blue-600 dark:text-blue-400">
            Execution Summary
          </span>
          <p>{run.execution_summary}</p>
        </div>
      )}

      {run.error_code && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-4 text-xs text-red-900 dark:text-red-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Error Diagnostic:</span> {run.error_code}
          </div>
        </div>
      )}

      {/* Lifecycle Event Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Workflow Lifecycle & Node Execution Timeline
        </h3>

        <WorkflowTimeline events={events || []} isLoading={isEventsLoading} />
      </div>

      {/* Grounded Final Response / Evidence */}
      {run.answer && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Synthesized Answer Output
          </h3>
          <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {run.answer}
          </p>
        </div>
      )}
    </div>
  );
};
