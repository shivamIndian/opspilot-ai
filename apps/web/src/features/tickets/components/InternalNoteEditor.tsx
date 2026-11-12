import React, { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';

interface InternalNoteEditorProps {
  onSubmit: (body: string) => Promise<void>;
  disabled?: boolean;
}

export const InternalNoteEditor: React.FC<InternalNoteEditorProps> = ({
  onSubmit,
  disabled = false,
}) => {
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(body.trim());
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post internal note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-2.5"
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
        <Lock className="w-3.5 h-3.5" />
        <span>Staff-Only Internal Note</span>
        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal ml-auto">
          Hidden from ticket creator & standard members
        </span>
      </div>

      {error && (
        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      <textarea
        rows={3}
        value={body}
        onChange={e => setBody(e.target.value)}
        disabled={disabled || isSubmitting}
        placeholder="Type internal thoughts, debug notes, or team coordination messages..."
        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-900/60 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition disabled:opacity-50"
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={disabled || isSubmitting || !body.trim()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          Save Internal Note
        </button>
      </div>
    </form>
  );
};
