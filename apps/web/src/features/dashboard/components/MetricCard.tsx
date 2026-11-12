import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

export interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  trend?: {
    value: string;
    positive?: boolean;
  };
  loading?: boolean;
  onClick?: () => void;
  accentColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  loading = false,
  onClick,
  accentColor = 'var(--brand-primary)',
}) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3.5 w-36" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-sm transition-all duration-200 ${
        onClick
          ? 'cursor-pointer hover:border-[var(--brand-primary)] hover:shadow-md'
          : 'hover:border-[var(--border-hover)]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)]">{title}</span>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
            color: accentColor,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {badge && (
          <Badge variant={badge.variant || 'neutral'} size="sm">
            {badge.text}
          </Badge>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          {subtitle && <span>{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold ${
                trend.positive ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
