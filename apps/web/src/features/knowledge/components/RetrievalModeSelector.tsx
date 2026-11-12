import React from 'react';
import { Layers, Sparkles, Binary } from 'lucide-react';
import type { RetrievalMode } from '@/types/knowledge';

interface RetrievalModeSelectorProps {
  mode: RetrievalMode;
  onChange: (mode: RetrievalMode) => void;
  disabled?: boolean;
}

export const RetrievalModeSelector: React.FC<RetrievalModeSelectorProps> = ({
  mode,
  onChange,
  disabled = false,
}) => {
  const modes: Array<{
    id: RetrievalMode;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'hybrid',
      label: 'Hybrid Fusion',
      description: 'RRF (Semantic + Keywords)',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'semantic',
      label: 'Semantic Vector',
      description: 'Dense pgvector Cosine',
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
    {
      id: 'keyword',
      label: 'Exact Keyword',
      description: 'PostgreSQL Full-Text GIN',
      icon: <Binary className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
      {modes.map(m => {
        const isSelected = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              isSelected
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={m.description}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};
