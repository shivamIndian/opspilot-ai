import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowUpRight, CheckCircle } from 'lucide-react';
import type { ApprovalDashboardMetrics } from '../types/dashboard.types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface ApprovalSummaryWidgetProps {
  organizationId: string;
  data: ApprovalDashboardMetrics;
}

export const ApprovalSummaryWidget: React.FC<ApprovalSummaryWidgetProps> = ({
  organizationId,
  data,
}) => {
  const { pendingCount, statusDistribution, recentPending } = data;

  const getRiskVariant = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'danger' as const;
      case 'medium':
        return 'warning' as const;
      default:
        return 'neutral' as const;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <CardTitle>Human-in-the-Loop Governance</CardTitle>
          </div>
          <CardDescription>
            {pendingCount} proposal(s) awaiting approval • {statusDistribution.approved} approved • {statusDistribution.rejected} rejected
          </CardDescription>
        </div>
        <Link
          to={`/organizations/${organizationId}/approvals`}
          className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
        >
          <span>Approval Inbox</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <div className="p-5 pt-0 space-y-4">
        {/* Quick status counters */}
        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="font-semibold text-amber-700 dark:text-amber-400">Awaiting</div>
            <div className="mt-1 text-lg font-bold text-amber-900 dark:text-amber-200">
              {pendingCount}
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="font-semibold text-emerald-700 dark:text-emerald-400">Approved</div>
            <div className="mt-1 text-lg font-bold text-emerald-900 dark:text-emerald-200">
              {statusDistribution.approved}
            </div>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50/50 p-2.5 dark:border-red-900/40 dark:bg-red-950/20">
            <div className="font-semibold text-red-700 dark:text-red-400">Rejected</div>
            <div className="mt-1 text-lg font-bold text-red-900 dark:text-red-200">
              {statusDistribution.rejected}
            </div>
          </div>
        </div>

        {/* Pending approvals review list */}
        {recentPending.length > 0 ? (
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
              Action Proposals Needing Decision
            </div>
            <div className="divide-y divide-[var(--border-default)] rounded-lg border border-[var(--border-default)] overflow-hidden">
              {recentPending.map((prop) => (
                <div
                  key={prop.id}
                  className="flex items-center justify-between p-3 text-xs hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-[var(--text-primary)]">
                      {prop.toolName.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">
                      Type: {prop.actionType} • Created {new Date(prop.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRiskVariant(prop.riskLevel)} size="sm">
                      {prop.riskLevel.toUpperCase()}
                    </Badge>
                    <Link
                      to={`/organizations/${organizationId}/approvals`}
                      className="rounded bg-[var(--surface-secondary)] px-2 py-1 text-[11px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--surface-hover)]"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border-default)] p-4 text-center text-xs text-[var(--text-secondary)]">
            <CheckCircle className="mx-auto h-5 w-5 text-emerald-500 mb-1" />
            No proposals pending decision. All agent actions are up to date.
          </div>
        )}
      </div>
    </Card>
  );
};
