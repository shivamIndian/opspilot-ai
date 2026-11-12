import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface TicketCommentFormProps {
  onSubmit: (body: string) => Promise<void>;
  disabled?: boolean;
}

export const TicketCommentForm: React.FC<TicketCommentFormProps> = ({
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
      setError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}
      <div className="relative">
        <textarea
          rows={3}
          value={body}
          onChange={e => setBody(e.target.value)}
          disabled={disabled || isSubmitting}
          placeholder="Write a public reply..."
          className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={disabled || isSubmitting || !body.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Post Reply
        </button>
      </div>
    </form>
  );
};
