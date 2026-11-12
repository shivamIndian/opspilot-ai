import React from 'react';
import type { DocumentStatus } from '../types/document.types';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  if (status === 'archived') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/60 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
        Archived
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
      Active
    </span>
  );
};
