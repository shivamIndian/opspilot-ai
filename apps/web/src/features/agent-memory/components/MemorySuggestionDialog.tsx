import React from 'react';
import { Check, X, Sparkles, HelpCircle } from 'lucide-react';
import type { MemoryCandidateProposal } from '../types/memory.types';
import { MemoryTypeBadge } from './MemoryTypeBadge';

interface MemorySuggestionDialogProps {
  candidates: MemoryCandidateProposal[];
  onApprove: (candidate: MemoryCandidateProposal) => Promise<void>;
  onReject: (candidateId: string) => void;
  isProcessing: boolean;
}

export const MemorySuggestionDialog: React.FC<MemorySuggestionDialogProps> = ({
  candidates,
  onApprove,
  onReject,
  isProcessing,
}) => {
  if (candidates.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
        <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
          No Pending Memory Suggestions
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          As you chat with OpsPilot AI, durable preferences and operational facts will be proposed
          here for your review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Pending Memory Candidate Proposals ({candidates.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Explicit confirmation required: Review and accept only memories you wish to retain.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {candidates.map((cand) => (
          <div
            key={cand.candidate_id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <MemoryTypeBadge type={cand.memory_type} />
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  {cand.category}
                </span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  {Math.round(cand.confidence * 100)}% Confidence
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onReject(cand.candidate_id)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Dismiss
                </button>
                <button
                  onClick={() => onApprove(cand)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve & Save
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {cand.title}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-100 dark:border-slate-800/60 font-mono text-xs">
                {cand.content}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>Reasoning: {cand.reasoning}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
