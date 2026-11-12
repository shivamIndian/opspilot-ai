import React from 'react';
import { Sparkles, BookOpen, FileText, Repeat } from 'lucide-react';
import type { MemoryType } from '../types/memory.types';

interface MemoryTypeBadgeProps {
  type: MemoryType;
  className?: string;
}

export const MemoryTypeBadge: React.FC<MemoryTypeBadgeProps> = ({ type, className = '' }) => {
  const config: Record<
    MemoryType,
    { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
  > = {
    preference: {
      label: 'Preference',
      icon: <Sparkles className="w-3.5 h-3.5 mr-1" />,
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
    },
    contextual_fact: {
      label: 'Context Fact',
      icon: <BookOpen className="w-3.5 h-3.5 mr-1" />,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    workflow_summary: {
      label: 'Workflow Summary',
      icon: <FileText className="w-3.5 h-3.5 mr-1" />,
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
    },
    recurring_pattern: {
      label: 'Pattern',
      icon: <Repeat className="w-3.5 h-3.5 mr-1" />,
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
    },
  };

  const current = config[type] || config.preference;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      {current.icon}
      {current.label}
    </span>
  );
};
