import React from 'react';

export interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6 sm:p-8 shadow-xl backdrop-blur-sm transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
};
