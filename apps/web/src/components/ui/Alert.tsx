import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AlertVariant } from '@/types/ui.types';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  className,
}) => {
  const config = {
    info: {
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
      styles: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/70 text-sky-900 dark:text-sky-200',
    },
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      styles: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      styles: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      styles: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/70 text-rose-900 dark:text-rose-200',
    },
  };

  const current = config[variant];

  return (
    <div
      role="alert"
      className={cn('flex items-start gap-3 p-4 rounded-lg border text-sm', current.styles, className)}
    >
      {current.icon}
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-0.5">{title}</h4>}
        <div className="leading-relaxed opacity-95">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-current opacity-60 hover:opacity-100 p-0.5 rounded transition-opacity"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
