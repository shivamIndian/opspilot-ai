import React from 'react';
import { Link } from 'react-router-dom';
import { Workflow, ArrowUpRight, Zap } from 'lucide-react';
import type { WorkflowAnalyticsSummary } from '../types/dashboard.types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface AgentActivityOverviewProps {
  organizationId: string;
  data: WorkflowAnalyticsSummary;
}

export const AgentActivityOverview: React.FC<AgentActivityOverviewProps> = ({
  organizationId,
  data,
}) => {
  const {
    total_runs,
    successful_runs,
    failed_runs,
    waiting_approval_runs,
    running_runs,
    success_rate,
    avg_duration_ms,
    total_tool_calls,
    recent_runs,
  } = data;

  const formatDuration = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CardTitle>AI Agent Activity & Telemetry</CardTitle>
          </div>
          <CardDescription>
            {total_runs} workflow run(s) • {success_rate}% success rate • {formatDuration(avg_duration_ms)} avg latency
          </CardDescription>
        </div>
        <Link
          to={`/organizations/${organizationId}/agent/workflows`}
          className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
        >
          <span>Workflows</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <div className="p-5 pt-0 space-y-5">
        {/* Metric summary boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3">
            <div className="text-xs text-[var(--text-secondary)]">Total Runs</div>
            <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">{total_runs}</div>
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">{running_runs} active now</div>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3">
            <div className="text-xs text-[var(--text-secondary)]">Success Rate</div>
            <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{success_rate}%</div>
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">{successful_runs} completed</div>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3">
            <div className="text-xs text-[var(--text-secondary)]">Avg Latency</div>
            <div className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatDuration(avg_duration_ms)}
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">Per workflow run</div>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3">
            <div className="text-xs text-[var(--text-secondary)]">Tool Calls</div>
            <div className="mt-1 text-xl font-bold text-purple-600 dark:text-purple-400">{total_tool_calls}</div>
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">Executed actions</div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            <span>Execution Reliability</span>
            <span className="font-semibold text-[var(--text-primary)]">{successful_runs} / {total_runs} Successful</span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]">
            <div
              style={{ width: `${total_runs > 0 ? (successful_runs / total_runs) * 100 : 0}%` }}
              className="bg-emerald-500 transition-all duration-300"
            />
            <div
              style={{ width: `${total_runs > 0 ? (failed_runs / total_runs) * 100 : 0}%` }}
              className="bg-red-500 transition-all duration-300"
            />
            <div
              style={{ width: `${total_runs > 0 ? (waiting_approval_runs / total_runs) * 100 : 0}%` }}
              className="bg-amber-500 transition-all duration-300"
            />
          </div>
        </div>

        {/* Recent Runs List */}
        {recent_runs.length > 0 && (
          <div className="border-t border-[var(--border-default)] pt-4">
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2.5">
              Recent Agent Runs
            </div>
            <div className="divide-y divide-[var(--border-default)] rounded-lg border border-[var(--border-default)] overflow-hidden">
              {recent_runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-2.5 text-xs hover:bg-[var(--surface-secondary)]">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                    <span className="font-medium text-[var(--text-primary)]">
                      {run.intent || run.selected_tool || 'Workflow Execution'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {run.duration_ms && (
                      <span className="text-[var(--text-tertiary)]">{Math.round(run.duration_ms)}ms</span>
                    )}
                    <Badge
                      variant={
                        run.status === 'completed'
                          ? 'success'
                          : run.status === 'failed'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {run.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
