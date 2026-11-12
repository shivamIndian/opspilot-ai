import React from 'react';
import { Check, X } from 'lucide-react';

export interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

export const getPasswordRules = (password: string): PasswordRule[] => {
  return [
    { id: 'length', label: 'At least 12 characters', met: password.length >= 12 },
    { id: 'uppercase', label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'One lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { id: 'number', label: 'One number (0-9)', met: /\d/.test(password) },
    { id: 'special', label: 'One special symbol (!@#$%...)', met: /[^A-Za-z0-9]/.test(password) },
  ];
};

export const isPasswordValid = (password: string): boolean => {
  const rules = getPasswordRules(password);
  return rules.every(r => r.met);
};

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className = '',
}) => {
  const rules = getPasswordRules(password);
  const metCount = rules.filter(r => r.met).length;

  let strengthLabel = 'Very Weak';
  let barColor = 'bg-rose-500';
  let filledBars = 1;

  if (password.length === 0) {
    strengthLabel = 'Enter password';
    filledBars = 0;
  } else if (metCount <= 2) {
    strengthLabel = 'Weak';
    barColor = 'bg-rose-500';
    filledBars = 1;
  } else if (metCount === 3) {
    strengthLabel = 'Fair';
    barColor = 'bg-amber-500';
    filledBars = 2;
  } else if (metCount === 4) {
    strengthLabel = 'Good';
    barColor = 'bg-indigo-500';
    filledBars = 3;
  } else if (metCount === 5) {
    strengthLabel = 'Strong';
    barColor = 'bg-emerald-500';
    filledBars = 4;
  }

  return (
    <div className={`space-y-2 mt-2 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[var(--text-tertiary)]">Password Strength:</span>
          <span
            className={`font-semibold ${
              filledBars === 4
                ? 'text-emerald-500'
                : filledBars === 3
                  ? 'text-indigo-400'
                  : filledBars === 2
                    ? 'text-amber-500'
                    : 'text-rose-500'
            }`}
          >
            {strengthLabel}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          {[1, 2, 3, 4].map(idx => (
            <div
              key={idx}
              className={`h-full rounded-full transition-colors duration-200 ${
                idx <= filledBars ? barColor : 'bg-[var(--border-subtle)]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Rules Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 text-[11px]">
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`flex items-center gap-1.5 transition-colors ${
              rule.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-tertiary)]'
            }`}
          >
            {rule.met ? (
              <Check className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
