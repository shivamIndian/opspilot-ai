import React from 'react';
import { Lock, MessageSquare } from 'lucide-react';
import type { SafeTicketComment } from '../types/ticket.types';
import { formatRelativeTime } from '../utils/ticket-formatters';

interface TicketCommentListProps {
  comments: SafeTicketComment[];
  isLoading: boolean;
}

export const TicketCommentList: React.FC<TicketCommentListProps> = ({ comments, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No comments yet. Start the conversation below.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map(comment => {
        const isInternal = comment.visibility === 'internal';

        return (
          <div
            key={comment.id}
            className={`p-4 rounded-xl border transition-all ${
              isInternal
                ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isInternal
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                  }`}
                >
                  {comment.author?.name ? comment.author.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {comment.author?.name || 'Unknown User'}
                    </span>
                    {isInternal && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        <Lock className="w-2.5 h-2.5" />
                        Internal Note
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">{comment.author?.email}</span>
                </div>
              </div>
              <span className="text-xs text-slate-400">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>

            {/* Comment Body */}
            <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap pl-9 leading-relaxed">
              {comment.body}
            </div>
          </div>
        );
      })}
    </div>
  );
};
