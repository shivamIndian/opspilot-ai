import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock, SkipForward } from 'lucide-react';
import type { DocumentEmbeddingStatus } from '../types/document.types';

interface EmbeddingStatusBadgeProps {
  status: DocumentEmbeddingStatus;
  className?: string;
}

export const EmbeddingStatusBadge: React.FC<EmbeddingStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'completed':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50 ${className}`}
        >
          <CheckCircle className="w-3 h-3 text-teal-500" />
          <span>Vector: Ready</span>
        </span>
      );

    case 'processing':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 ${className}`}
        >
          <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />
          <span>Vector: Embedding</span>
        </span>
      );

    case 'queued':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 ${className}`}
        >
          <Clock className="w-3 h-3 text-amber-500" />
          <span>Vector: Queued</span>
        </span>
      );

    case 'failed':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 ${className}`}
        >
          <AlertCircle className="w-3 h-3 text-rose-500" />
          <span>Vector: Failed</span>
        </span>
      );

    case 'skipped':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 ${className}`}
        >
          <SkipForward className="w-3 h-3" />
          <span>Vector: Skipped</span>
        </span>
      );

    case 'pending':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 ${className}`}
        >
          <Clock className="w-3 h-3" />
          <span>Vector: Pending</span>
        </span>
      );
  }
};
