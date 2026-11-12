import React from 'react';
import type { ProposalRiskLevel, ProposalStatus, ExecutionStatus } from '../types/agent-approvals.types';

interface RiskBadgeProps {
  level: ProposalRiskLevel;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className = '' }) => {
  const styles: Record<ProposalRiskLevel, string> = {
    low: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200',
    medium: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300',
    high: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300',
    critical: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 animate-pulse',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide border uppercase ${styles[level] || styles.medium} ${className}`}
    >
      {level} Risk
    </span>
  );
};

interface StatusBadgeProps {
  status: ProposalStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const styles: Record<ProposalStatus, { label: string; class: string }> = {
    awaiting_approval: {
      label: 'Awaiting Approval',
      class: 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    approved: {
      label: 'Approved',
      class: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
    },
    rejected: {
      label: 'Rejected',
      class: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300',
    },
    executed: {
      label: 'Executed',
      class: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    failed: {
      label: 'Execution Failed',
      class: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
    },
    cancelled: {
      label: 'Cancelled',
      class: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300',
    },
  };

  const current = styles[status] || { label: status, class: 'bg-gray-100 text-gray-800 border-gray-200' };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.class} ${className}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-80" />
      {current.label}
    </span>
  );
};

export const ProposalStatusBadge = StatusBadge;

interface ExecutionStatusBadgeProps {
  status: ExecutionStatus;
  className?: string;
}

export const ExecutionStatusBadge: React.FC<ExecutionStatusBadgeProps> = ({ status, className = '' }) => {
  const styles: Record<ExecutionStatus, { label: string; class: string }> = {
    pending: {
      label: 'Pending',
      class: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300',
    },
    success: {
      label: 'Success',
      class: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    failed: {
      label: 'Failed',
      class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300',
    },
  };

  const current = styles[status] || styles.pending;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border uppercase ${current.class} ${className}`}
    >
      {current.label}
    </span>
  );
};
