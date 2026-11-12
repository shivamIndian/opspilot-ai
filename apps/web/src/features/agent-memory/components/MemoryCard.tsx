import React from 'react';
import { Edit2, Trash2, Calendar, ShieldCheck } from 'lucide-react';
import type { SafeAgentMemory } from '../types/memory.types';
import { MemoryTypeBadge } from './MemoryTypeBadge';

interface MemoryCardProps {
  memory: SafeAgentMemory;
  onEdit: (memory: SafeAgentMemory) => void;
  onDelete: (memory: SafeAgentMemory) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onEdit, onDelete }) => {
  const formattedDate = new Date(memory.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <MemoryTypeBadge type={memory.memory_type} />
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {memory.category}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(memory)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Edit Memory"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(memory)}
              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Delete Memory"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
          {memory.title}
        </h3>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-4">
          {memory.content}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5" title="Verified & screened memory">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Importance: {memory.importance_score}/10</span>
        </div>

        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};
