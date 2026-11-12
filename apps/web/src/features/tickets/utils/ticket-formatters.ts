import type { TicketStatus, TicketPriority, TicketCategory } from '../types/ticket.types';

export const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  open: {
    label: 'Open',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/30',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
  },
  waiting_on_customer: {
    label: 'Waiting on Customer',
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/30',
  },
  resolved: {
    label: 'Resolved',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
  },
  closed: {
    label: 'Closed',
    bg: 'bg-zinc-500/10 dark:bg-zinc-500/20',
    text: 'text-zinc-700 dark:text-zinc-400',
    border: 'border-zinc-500/30',
  },
};

export const PRIORITY_CONFIG: Record<
  TicketPriority,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  low: {
    label: 'Low',
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
  },
  high: {
    label: 'High',
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
  },
  urgent: {
    label: 'Urgent',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
    dot: 'bg-rose-600 animate-pulse',
  },
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  technical_support: 'Technical Support',
  account_access: 'Account Access',
  bug_report: 'Bug Report',
  billing: 'Billing & Payments',
  feature_request: 'Feature Request',
  general: 'General Inquiry',
};

export const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};
