import React from 'react';
import { Bot } from 'lucide-react';

export interface AuthPageHeaderProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  badge?: string;
}

export const AuthPageHeader: React.FC<AuthPageHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
}) => {
  return (
    <div className="text-center space-y-2 mb-6">
      <div className="inline-flex p-3 bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 rounded-2xl text-[var(--brand-primary)] mb-1 shadow-sm">
        {icon || <Bot className="w-7 h-7" />}
      </div>
      {badge && (
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">
            {badge}
          </span>
        </div>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h1>
      <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">{subtitle}</p>
    </div>
  );
};
