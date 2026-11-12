import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { SafeAgentMemory } from '../types/memory.types';

interface MemoryDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  memory?: SafeAgentMemory | null;
  isPurgeAll?: boolean;
  isDeleting: boolean;
}

export const MemoryDeleteDialog: React.FC<MemoryDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  memory,
  isPurgeAll = false,
  isDeleting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {isPurgeAll ? 'Purge All Agent Memories?' : 'Delete Memory Item?'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                This operation cannot be reversed.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          {isPurgeAll ? (
            'Are you sure you want to permanently delete all of your stored agent preferences, facts, and embeddings? All AI agents will lose personal context across conversations.'
          ) : (
            <>
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-slate-100">"{memory?.title}"</span>?
            </>
          )}
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : isPurgeAll ? 'Purge All' : 'Delete Memory'}
          </button>
        </div>
      </div>
    </div>
  );
};
