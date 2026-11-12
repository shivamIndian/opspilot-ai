import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

export const SearchLoadingState: React.FC = () => {
  return (
    <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Retrieving knowledge passages...
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Generating query vector embeddings, executing pgvector cosine search, scanning full-text
          GIN indexes, and applying Reciprocal Rank Fusion.
        </p>
      </div>

      {/* Skeleton cards */}
      <div className="w-full max-w-md space-y-2.5 pt-2">
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-3/4 mx-auto" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/2 mx-auto" />
      </div>
    </div>
  );
};
