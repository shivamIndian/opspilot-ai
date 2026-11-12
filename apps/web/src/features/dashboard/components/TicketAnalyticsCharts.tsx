import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket, ArrowUpRight, CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react';
import type { TicketDashboardMetrics } from '../types/dashboard.types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export interface TicketAnalyticsChartsProps {
  organizationId: string;
  data: TicketDashboardMetrics;
}

export const TicketAnalyticsCharts: React.FC<TicketAnalyticsChartsProps> = ({
  organizationId,
  data,
}) => {
  const { total, statusDistribution, priorityDistribution, volumeTrend } = data;

  const resolvedTotal = statusDistribution.resolved + statusDistribution.closed;
  const resolutionRate = total > 0 ? Math.round((resolvedTotal / total) * 100) : 0;

  // Find max value in volume trend for SVG normalization
  const maxVolume = Math.max(
    1,
    ...volumeTrend.map((d) => Math.max(d.created, d.resolved))
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[var(--brand-primary)]" />
            <CardTitle>Support Ticket Operations</CardTitle>
          </div>
          <CardDescription>
            {total} total ticket(s) in selected period • {resolutionRate}% resolution rate
          </CardDescription>
        </div>
        <Link
          to={`/organizations/${organizationId}/tickets`}
          className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
        >
          <span>View All</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <div className="p-5 pt-0 space-y-6">
        {/* Status Distribution Bars */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] mb-2">
            <span>Status Pipeline</span>
            <span>{total} Total Tickets</span>
          </div>

          <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]">
            {statusDistribution.open > 0 && (
              <div
                style={{ width: `${(statusDistribution.open / total) * 100}%` }}
                className="bg-blue-500 transition-all duration-300"
                title={`Open: ${statusDistribution.open}`}
              />
            )}
            {statusDistribution.in_progress > 0 && (
              <div
                style={{ width: `${(statusDistribution.in_progress / total) * 100}%` }}
                className="bg-amber-500 transition-all duration-300"
                title={`In Progress: ${statusDistribution.in_progress}`}
              />
            )}
            {statusDistribution.waiting_on_customer > 0 && (
              <div
                style={{ width: `${(statusDistribution.waiting_on_customer / total) * 100}%` }}
                className="bg-purple-500 transition-all duration-300"
                title={`Waiting: ${statusDistribution.waiting_on_customer}`}
              />
            )}
            {statusDistribution.resolved > 0 && (
              <div
                style={{ width: `${(statusDistribution.resolved / total) * 100}%` }}
                className="bg-emerald-500 transition-all duration-300"
                title={`Resolved: ${statusDistribution.resolved}`}
              />
            )}
            {statusDistribution.closed > 0 && (
              <div
                style={{ width: `${(statusDistribution.closed / total) * 100}%` }}
                className="bg-gray-400 transition-all duration-300"
                title={`Closed: ${statusDistribution.closed}`}
              />
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[var(--text-secondary)]">Open:</span>
              <span className="font-semibold text-[var(--text-primary)]">{statusDistribution.open}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[var(--text-secondary)]">In Progress:</span>
              <span className="font-semibold text-[var(--text-primary)]">{statusDistribution.in_progress}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-[var(--text-secondary)]">Waiting:</span>
              <span className="font-semibold text-[var(--text-primary)]">{statusDistribution.waiting_on_customer}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[var(--text-secondary)]">Resolved:</span>
              <span className="font-semibold text-[var(--text-primary)]">{statusDistribution.resolved}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              <span className="text-[var(--text-secondary)]">Closed:</span>
              <span className="font-semibold text-[var(--text-primary)]">{statusDistribution.closed}</span>
            </div>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="border-t border-[var(--border-default)] pt-4">
          <div className="text-xs font-medium text-[var(--text-secondary)] mb-2.5">
            Priority Breakdown
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-2.5 dark:border-red-900/40 dark:bg-red-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">Urgent</span>
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              </div>
              <div className="mt-1 text-lg font-bold text-red-900 dark:text-red-200">
                {priorityDistribution.urgent}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">High</span>
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="mt-1 text-lg font-bold text-amber-900 dark:text-amber-200">
                {priorityDistribution.high}
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Medium</span>
                <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-1 text-lg font-bold text-blue-900 dark:text-blue-200">
                {priorityDistribution.medium}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 dark:border-gray-800 dark:bg-gray-900/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-400">Low</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-200">
                {priorityDistribution.low}
              </div>
            </div>
          </div>
        </div>

        {/* Volume Trend Timeline (Chart) */}
        {volumeTrend.length > 0 && (
          <div className="border-t border-[var(--border-default)] pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Daily Ticket Inflow vs Resolution
              </span>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" /> Created
                </span>
                <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Resolved
                </span>
              </div>
            </div>

            {/* Accessible SVG Bar Chart */}
            <div className="h-32 w-full pt-2">
              <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${volumeTrend.length * 20} 80`}>
                {volumeTrend.map((pt, idx) => {
                  const createdH = (pt.created / maxVolume) * 70;
                  const resolvedH = (pt.resolved / maxVolume) * 70;
                  const x = idx * 20 + 4;

                  return (
                    <g key={pt.date} className="group">
                      {/* Created bar */}
                      <rect
                        x={x}
                        y={80 - createdH}
                        width="5"
                        height={Math.max(2, createdH)}
                        rx="1.5"
                        className="fill-[var(--brand-primary)] opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <title>{`${pt.date}: ${pt.created} created`}</title>
                      </rect>
                      {/* Resolved bar */}
                      <rect
                        x={x + 6}
                        y={80 - resolvedH}
                        width="5"
                        height={Math.max(2, resolvedH)}
                        rx="1.5"
                        className="fill-emerald-500 opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <title>{`${pt.date}: ${pt.resolved} resolved`}</title>
                      </rect>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mt-1">
              <span>{volumeTrend[0]?.date}</span>
              <span>{volumeTrend[volumeTrend.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
