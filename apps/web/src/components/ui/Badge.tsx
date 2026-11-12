import React from 'react';
import { cn } from '@/utils/cn';
import type { BadgeVariant, ComponentSize } from '@/types/ui.types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: ComponentSize;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  icon,
  children,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    default:
      'bg-slate-100 dark:bg-[#111C31] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#273449]',
    primary:
      'bg-primary-50 dark:bg-[#6366F1]/15 text-primary-700 dark:text-[#818CF8] border-primary-200 dark:border-[#6366F1]/30',
    success:
      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80',
    warning:
      'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80',
    error:
      'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80',
    info:
      'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/80',
    outline:
      'bg-transparent text-slate-700 dark:text-[#CBD5E1] border-slate-300 dark:border-[#273449]',
    neutral:
      'bg-slate-100 dark:bg-[#111C31] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#273449]',
    danger:
      'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80',
  };

  const sizeStyles: Record<ComponentSize, string> = {
    sm: 'px-2 py-0.2 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full border tracking-wide uppercase',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
