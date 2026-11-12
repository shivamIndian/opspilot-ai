import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import type { CreateTicketInput, TicketCategory, TicketPriority } from '../types/ticket.types';
import { CATEGORY_LABELS } from '../utils/ticket-formatters';

interface TicketCreateFormProps {
  organizationId: string;
  onSubmit: (input: CreateTicketInput) => Promise<string>; // Returns created ticket ID
  canSetPriority?: boolean;
}

export const TicketCreateForm: React.FC<TicketCreateFormProps> = ({
  organizationId,
  onSubmit,
  canSetPriority = true,
}) => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 3) {
      setError('Subject must be at least 3 characters');
      return;
    }
    if (description.trim().length < 5) {
      setError('Description must be at least 5 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const createdId = await onSubmit({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority: canSetPriority ? priority : 'medium',
      });
      navigate(`/organizations/${organizationId}/tickets/${createdId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 max-w-2xl"
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Create New Support Ticket
        </h2>
        <button
          type="button"
          onClick={() => navigate(`/organizations/${organizationId}/tickets`)}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Subject */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Subject <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Brief summary of the issue (e.g., Cannot access billing reports)"
          maxLength={200}
          required
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
          <span>Minimum 3 characters</span>
          <span>{subject.length}/200</span>
        </div>
      </div>

      {/* Category & Priority Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Category <span className="text-rose-500">*</span>
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as TicketCategory)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Priority
          </label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as TicketPriority)}
            disabled={!canSetPriority}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="low">Low</option>
            <option value="medium">Medium (Default)</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          {!canSetPriority && (
            <p className="text-[10px] text-slate-400 mt-1">Priority is managed by team admins</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Description <span className="text-rose-500">*</span>
        </label>
        <textarea
          rows={6}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Please provide steps to reproduce, error messages, or details..."
          maxLength={10000}
          required
          className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
          <span>Minimum 5 characters</span>
          <span>{description.length}/10000</span>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Create Ticket
        </button>
      </div>
    </form>
  );
};
