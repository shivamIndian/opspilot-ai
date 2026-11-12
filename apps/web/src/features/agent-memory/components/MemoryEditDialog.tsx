import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { SafeAgentMemory, MemoryType, CreateMemoryInput, UpdateMemoryInput } from '../types/memory.types';

interface MemoryEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateMemoryInput | UpdateMemoryInput) => Promise<void>;
  editingMemory?: SafeAgentMemory | null;
  isSaving: boolean;
}

export const MemoryEditDialog: React.FC<MemoryEditDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMemory,
  isSaving,
}) => {
  const [memoryType, setMemoryType] = useState<MemoryType>('preference');
  const [category, setCategory] = useState('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [importanceScore, setImportanceScore] = useState(5);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingMemory) {
      setMemoryType(editingMemory.memory_type);
      setCategory(editingMemory.category);
      setTitle(editingMemory.title);
      setContent(editingMemory.content);
      setImportanceScore(editingMemory.importance_score);
    } else {
      setMemoryType('preference');
      setCategory('general');
      setTitle('');
      setContent('');
      setImportanceScore(5);
    }
    setErrorMsg(null);
  }, [editingMemory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 3) {
      setErrorMsg('Title must be at least 3 characters long.');
      return;
    }
    if (!content.trim() || content.length < 3) {
      setErrorMsg('Content must be at least 3 characters long.');
      return;
    }

    try {
      setErrorMsg(null);
      if (editingMemory) {
        await onSave({
          category,
          title,
          content,
          importance_score: importanceScore,
        } as UpdateMemoryInput);
      } else {
        await onSave({
          memory_type: memoryType,
          category,
          title,
          content,
          importance_score: importanceScore,
        } as CreateMemoryInput);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save memory item');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {editingMemory ? 'Edit Agent Memory' : 'Create Agent Memory'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-md border border-rose-200 dark:border-rose-900/60">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!editingMemory && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Memory Type
                </label>
                <select
                  value={memoryType}
                  onChange={(e) => setMemoryType(e.target.value as MemoryType)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="preference">Preference</option>
                  <option value="contextual_fact">Context Fact</option>
                  <option value="workflow_summary">Workflow Summary</option>
                  <option value="recurring_pattern">Recurring Pattern</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. dev, ui, cloud"
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descriptive Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Prefers TypeScript and strict typing"
              className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Memory Content
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the factual preference or operational background..."
              className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-sans"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Security notice: Prohibited credentials, passwords, and sensitive PII are automatically screened and rejected.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Importance Level (1 to 10)
              </label>
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                {importanceScore}/10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={importanceScore}
              onChange={(e) => setImportanceScore(Number(e.target.value))}
              className="w-full accent-primary-600 cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingMemory ? 'Save Changes' : 'Create Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
