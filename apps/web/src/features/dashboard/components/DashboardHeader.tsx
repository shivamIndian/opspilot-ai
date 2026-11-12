import React from 'react';
import { RefreshCw, Calendar, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { DashboardPeriodKey } from '../types/dashboard.types';

export interface DashboardHeaderProps {
  organizationName: string;
  role?: string;
  period: DashboardPeriodKey;
  onPeriodChange: (period: DashboardPeriodKey) => void;
  onRefresh: () => void;
  isFetching?: boolean;
  lastUpdated?: Date;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  organizationName,
  role = 'admin',
  period,
  onPeriodChange,
  onRefresh,
  isFetching = false,
  lastUpdated,
}) => {
  const periodOptions: Array<{ key: DashboardPeriodKey; label: string }> = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-default)] pb-5">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Operations & AI Dashboard
          </h1>
          <Badge variant="primary" size="sm">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {role.toUpperCase()}
            </span>
          </Badge>
        </div>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Real-time overview of support tickets, enterprise knowledge base, AI workflows, and governance approvals for{' '}
          <span className="font-semibold text-[var(--text-primary)]">{organizationName}</span>.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Period Selector Tabs */}
        <div className="flex items-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-1 shadow-sm">
          <Calendar className="ml-2 mr-1 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          {periodOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onPeriodChange(opt.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                period === opt.key
                  ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Refresh Action Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>

        {lastUpdated && (
          <span className="hidden lg:inline text-xs text-[var(--text-tertiary)]">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
};
