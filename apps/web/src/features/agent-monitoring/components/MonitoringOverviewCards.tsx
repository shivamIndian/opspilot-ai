import React from 'react';
import { Activity, CheckCircle2, XCircle, Clock, ShieldAlert, Cpu } from 'lucide-react';
import type { MonitoringOverview } from '../types/agent-monitoring.types';

interface MonitoringOverviewCardsProps {
  overview?: MonitoringOverview;
  isLoading?: boolean;
}

export const MonitoringOverviewCards: React.FC<MonitoringOverviewCardsProps> = ({
  overview,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Workflows',
      value: overview?.totalRuns ?? 0,
      icon: Activity,
      textColor: 'text-slate-900 dark:text-slate-100',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Success Rate',
      value: `${overview?.successRate ?? 0}%`,
      icon: CheckCircle2,
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Failed Runs',
      value: overview?.failedRuns ?? 0,
      icon: XCircle,
      textColor:
        (overview?.failedRuns ?? 0) > 0
          ? 'text-red-600 dark:text-red-400 font-bold'
          : 'text-slate-700 dark:text-slate-300',
      bgColor: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
    },
    {
      title: 'Waiting Approval',
      value: overview?.waitingApprovalRuns ?? 0,
      icon: ShieldAlert,
      textColor:
        (overview?.waitingApprovalRuns ?? 0) > 0
          ? 'text-amber-600 dark:text-amber-400 font-bold'
          : 'text-slate-700 dark:text-slate-300',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Avg Latency',
      value:
        (overview?.avgDurationMs ?? 0) > 0
          ? `${((overview?.avgDurationMs ?? 0) / 1000).toFixed(2)}s`
          : '0s',
      icon: Clock,
      textColor: 'text-slate-900 dark:text-slate-100',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Tool Invocations',
      value: overview?.totalToolCalls ?? 0,
      icon: Cpu,
      textColor: 'text-slate-900 dark:text-slate-100',
      bgColor: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bgColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl font-bold tracking-tight ${card.textColor}`}>
                {card.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
