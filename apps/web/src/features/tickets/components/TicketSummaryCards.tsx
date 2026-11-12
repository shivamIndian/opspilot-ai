import React from 'react';
import { Inbox, Clock, HelpCircle, CheckCircle2, AlertTriangle, Flame } from 'lucide-react';
import type { TicketSummaryMetrics } from '../types/ticket.types';

interface TicketSummaryCardsProps {
  metrics?: TicketSummaryMetrics;
  isLoading?: boolean;
}

export const TicketSummaryCards: React.FC<TicketSummaryCardsProps> = ({ metrics, isLoading }) => {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl border border-slate-200 dark:border-slate-700"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Open',
      count: metrics.open,
      icon: Inbox,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-200 dark:border-blue-800/40',
    },
    {
      label: 'In Progress',
      count: metrics.inProgress,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800/40',
    },
    {
      label: 'Waiting on Customer',
      count: metrics.waitingOnCustomer,
      icon: HelpCircle,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      border: 'border-purple-200 dark:border-purple-800/40',
    },
    {
      label: 'Resolved',
      count: metrics.resolved,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800/40',
    },
    {
      label: 'Urgent',
      count: metrics.urgent,
      icon: Flame,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'border-rose-200 dark:border-rose-800/40',
    },
    {
      label: 'High Priority',
      count: metrics.high,
      icon: AlertTriangle,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      border: 'border-orange-200 dark:border-orange-800/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`p-3.5 rounded-xl border ${card.bg} ${card.border} transition-all duration-150 hover:shadow-sm`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                {card.label}
              </span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className={`text-2xl font-bold tracking-tight ${card.color}`}>{card.count}</div>
          </div>
        );
      })}
    </div>
  );
};
