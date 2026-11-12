import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock, Hourglass } from 'lucide-react';
import type { DocumentProcessingStatus } from '../types/document.types';

interface ProcessingStatusBadgeProps {
  status: DocumentProcessingStatus;
  className?: string;
}

export const ProcessingStatusBadge: React.FC<ProcessingStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'completed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Ready
        </span>
      );

    case 'processing':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40 animate-pulse ${className}`}
        >
          <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
          Processing
        </span>
      );

    case 'queued':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 ${className}`}
        >
          <Hourglass className="w-3 h-3 text-blue-500" />
          Queued
        </span>
      );

    case 'failed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40 ${className}`}
        >
          <AlertCircle className="w-3 h-3 text-rose-500" />
          Failed
        </span>
      );

    case 'pending':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40 ${className}`}
        >
          <Clock className="w-3 h-3 text-amber-500" />
          Pending
        </span>
      );
  }
};
