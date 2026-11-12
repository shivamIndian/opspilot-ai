import React from 'react';
import {
  PlusCircle,
  Edit,
  UserCheck,
  UserX,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageSquare,
  Archive,
  Activity,
} from 'lucide-react';
import type { SafeTicketActivityLog, TicketAction } from '../types/ticket.types';
import { formatRelativeTime } from '../utils/ticket-formatters';

interface TicketActivityTimelineProps {
  activity: SafeTicketActivityLog[];
  isLoading: boolean;
}

const ACTION_CONFIG: Record<
  TicketAction,
  { label: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  'ticket.created': {
    label: 'Created ticket',
    icon: PlusCircle,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50',
  },
  'ticket.updated': {
    label: 'Updated details',
    icon: Edit,
    color: 'text-slate-500 bg-slate-50 dark:bg-slate-900',
  },
  'ticket.assigned': {
    label: 'Assigned ticket',
    icon: UserCheck,
    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50',
  },
  'ticket.unassigned': {
    label: 'Unassigned ticket',
    icon: UserX,
    color: 'text-slate-500 bg-slate-50 dark:bg-slate-900',
  },
  'ticket.priority_changed': {
    label: 'Changed priority',
    icon: AlertTriangle,
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/50',
  },
  'ticket.status_changed': {
    label: 'Changed status',
    icon: Clock,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50',
  },
  'ticket.resolved': {
    label: 'Resolved ticket',
    icon: CheckCircle2,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
  },
  'ticket.closed': {
    label: 'Closed ticket',
    icon: XCircle,
    color: 'text-zinc-500 bg-zinc-50 dark:bg-zinc-900',
  },
  'ticket.reopened': {
    label: 'Reopened ticket',
    icon: RotateCcw,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50',
  },
  'ticket.comment_added': {
    label: 'Added a comment',
    icon: MessageSquare,
    color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/50',
  },
  'ticket.archived': {
    label: 'Archived ticket',
    icon: Archive,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/50',
  },
};

export const TicketActivityTimeline: React.FC<TicketActivityTimelineProps> = ({
  activity,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-xs">
        <Activity className="w-5 h-5 mx-auto mb-1 opacity-50" />
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {activity.map(item => {
        const config = ACTION_CONFIG[item.action] || {
          label: item.action,
          icon: Activity,
          color: 'text-slate-500 bg-slate-50',
        };
        const Icon = config.icon;

        return (
          <div key={item.id} className="relative flex items-start gap-3 text-xs">
            {/* Timeline node */}
            <div
              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center ${config.color}`}
            >
              <Icon className="w-3 h-3" />
            </div>

            {/* Event details */}
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.actor?.name || 'System'}{' '}
                  <span className="font-normal text-slate-500 dark:text-slate-400">
                    {config.label}
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>

              {/* Show detail if metadata transition or changes present */}
              {item.metadata && 'transition' in item.metadata ? (
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded mt-1 inline-block">
                  {String(item.metadata.transition)}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
