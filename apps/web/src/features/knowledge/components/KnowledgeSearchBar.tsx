import React, { useState } from 'react';
import { Search, X, Loader2, ArrowRight, Sparkles } from 'lucide-react';

interface KnowledgeSearchBarProps {
  onSearch: (query: string) => void;
  onAskAI?: (query: string) => void;
  isLoading: boolean;
  isGeneratingAnswer?: boolean;
  initialQuery?: string;
}

export const KnowledgeSearchBar: React.FC<KnowledgeSearchBarProps> = ({
  onSearch,
  onAskAI,
  isLoading,
  isGeneratingAnswer = false,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading || isGeneratingAnswer) return;
    onSearch(query.trim());
  };

  const handleAskAIClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading || isGeneratingAnswer || !onAskAI) return;
    onAskAI(query.trim());
  };

  const handleClear = () => {
    setQuery('');
  };

  const isBusy = isLoading || isGeneratingAnswer;

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center shadow-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
        <div className="pl-4 text-slate-400">
          <Search className="w-5 h-5" />
        </div>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask a question or search company documents (e.g. 'How do I reset my SSO password?')"
          className="w-full py-4 pl-3 pr-48 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          disabled={isBusy}
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {query && !isBusy && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {onAskAI && (
            <button
              type="button"
              onClick={handleAskAIClick}
              disabled={!query.trim() || isBusy}
              className="inline-flex items-center gap-1 px-3 py-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-800 dark:disabled:to-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:cursor-not-allowed"
              title="Generate grounded AI answer with citations"
            >
              {isGeneratingAnswer ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ask AI</span>
                </>
              )}
            </button>
          )}

          <button
            type="submit"
            disabled={!query.trim() || isBusy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Searching...</span>
              </>
            ) : (
              <>
                <span>Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
