import React from 'react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, helperText, id, children, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-help` : undefined}
          className={cn(
            'w-full h-9 px-3 text-sm bg-white dark:bg-slate-900 border rounded-md transition-colors text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-rose-500 dark:border-rose-500/80 focus-visible:ring-rose-500'
              : 'border-slate-300 dark:border-slate-700',
            className
          )}
          {...props}
        >
          {options
            ? options.map(opt => (
                <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error ? (
          <p id={`${selectId}-error`} className="text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${selectId}-help`} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
