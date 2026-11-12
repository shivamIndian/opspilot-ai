import React from 'react';
import {
  PlayCircle,
  FileCode,
  Cpu,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import type { WorkflowEvent } from '../types/agent-monitoring.types';

interface WorkflowTimelineProps {
  events: WorkflowEvent[];
  isLoading?: boolean;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  events,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4 py-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-400">
        No lifecycle events recorded for this workflow run.
      </div>
    );
  }

  const getEventIcon = (type: WorkflowEvent['type']) => {
    switch (type) {
      case 'workflow_started':
        return <PlayCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'plan_generated':
        return <FileCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'tool_executed':
        return <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'approval_interrupted':
        return <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'workflow_completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'workflow_failed':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: WorkflowEvent['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Success
          </span>
        );
      case 'waiting':
        return (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Awaiting Action
          </span>
        );
      case 'failed':
        return (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800">
            Error
          </span>
        );
      case 'running':
        return (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-pulse">
            In Flight
          </span>
        );
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {events.map((evt) => (
        <div key={evt.id} className="relative flex items-start gap-4">
          <div className="absolute -left-6 mt-1 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm">
            {getEventIcon(evt.type)}
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {evt.label}
              </h4>
              <div className="flex items-center gap-2">
                {getStatusBadge(evt.status)}
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {evt.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
