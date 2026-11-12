import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, helperText, className, containerClassName = '', id, required, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : 'password-input');
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--text-primary)]">
            {label}
            {required && <span className="text-[var(--danger-text)] ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-tertiary)]">
            <Lock className="h-4 w-4" />
          </div>

          <input
            id={inputId}
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'block w-full rounded-xl border bg-[var(--surface-primary)] pl-10 pr-10 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent',
              error
                ? 'border-[var(--danger-border)] focus:ring-[var(--danger-border)]'
                : 'border-[var(--border-default)] hover:border-[var(--border-hover)]',
              className
            )}
            {...props}
          />

          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none"
            tabIndex={0}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <p id={errorId} className="text-[11px] text-[var(--danger-text)] flex items-center gap-1 font-medium">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-[11px] text-[var(--text-tertiary)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
