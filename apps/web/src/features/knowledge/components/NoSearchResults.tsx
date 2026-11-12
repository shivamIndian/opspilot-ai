import React from 'react';
import { SearchX, HelpCircle } from 'lucide-react';

interface NoSearchResultsProps {
  query: string;
}

export const NoSearchResults: React.FC<NoSearchResultsProps> = ({ query }) => {
  return (
    <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
        <SearchX className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No matching passages found
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          We could not find any relevant text chunks for &ldquo;
          <span className="font-semibold text-slate-700 dark:text-slate-300">{query}</span>&rdquo;
          in active organization documents.
        </p>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 mx-auto">
        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
        <span>
          Suggestions: Try Hybrid search mode, rephrase keywords, or verify documents are uploaded
          and processed.
        </span>
      </div>
    </div>
  );
};
