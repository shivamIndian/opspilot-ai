import React from 'react';
import { cn } from '@/utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    return (
      <div className="flex items-start gap-2.5">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          disabled={disabled}
          className={cn(
            'w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-[#273449] text-primary-600 focus:ring-brand-400 focus:ring-offset-2 dark:focus:ring-offset-[#080D19] bg-white dark:bg-[#080D19] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {(label || description) && (
          <label htmlFor={checkboxId} className="select-none cursor-pointer leading-tight">
            {label && (
              <span className="block text-xs font-medium text-slate-800 dark:text-[#CBD5E1]">
                {label}
              </span>
            )}
            {description && (
              <span className="block text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                {description}
              </span>
            )}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
