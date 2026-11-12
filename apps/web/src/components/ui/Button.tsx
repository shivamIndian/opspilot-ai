import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ButtonVariant, ComponentSize } from '@/types/ui.types';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ComponentSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm disabled:bg-primary-400 shadow-sm transition-all',
      secondary:
        'bg-slate-100 dark:bg-[#111C31] text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#273449] hover:bg-slate-200 dark:hover:bg-[#172338] hover:border-slate-300 dark:hover:border-[#3A4A63] active:bg-slate-300 dark:active:bg-[#1E2E4A] disabled:opacity-50 transition-all',
      outline:
        'border border-slate-300 dark:border-[#273449] bg-transparent text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#111C31] hover:border-slate-400 dark:hover:border-[#3A4A63] active:bg-slate-200 dark:active:bg-[#172338] disabled:opacity-40 transition-all',
      ghost:
        'bg-transparent text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#111C31] hover:text-slate-900 dark:hover:text-[#F8FAFC] active:bg-slate-200 dark:active:bg-[#172338] disabled:opacity-40 transition-all',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm disabled:bg-rose-400 transition-all',
    };

    const sizeStyles: Record<ComponentSize, string> = {
      sm: 'h-8 px-2.5 text-xs rounded-lg gap-1.5',
      md: 'h-9 px-3.5 text-sm rounded-lg gap-2',
      lg: 'h-11 px-5 text-base rounded-lg gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#080D19] disabled:cursor-not-allowed select-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
