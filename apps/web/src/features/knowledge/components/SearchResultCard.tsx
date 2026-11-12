import React, { useState } from 'react';
import { Copy, Check, Sparkles, Layers, Binary } from 'lucide-react';
import type { KnowledgeSearchResult } from '@/types/knowledge';
import { SourceCitation } from './SourceCitation';

interface SearchResultCardProps {
  result: KnowledgeSearchResult;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({ result }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const methodBadge = () => {
    switch (result.retrievalMethod) {
      case 'hybrid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Layers className="w-2.5 h-2.5" />
            Hybrid
          </span>
        );
      case 'semantic':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Sparkles className="w-2.5 h-2.5" />
            Semantic
          </span>
        );
      case 'keyword':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Binary className="w-2.5 h-2.5" />
            Keyword
          </span>
        );
    }
  };

  const formatScore = () => {
    if (result.scoreType === 'rrf') {
      return `RRF ${result.score.toFixed(4)}`;
    }
    if (result.scoreType === 'cosine_similarity') {
      return `Sim ${result.score.toFixed(3)}`;
    }
    return `Rank ${result.score.toFixed(3)}`;
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 dark:hover:border-indigo-500/40 transition-all space-y-3 group">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Rank Badge */}
          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
            #{result.rank}
          </span>

          {methodBadge()}

          {/* Raw Score (not described as a confidence percentage) */}
          <span
            className="text-[10px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50"
            title={`Raw retrieval score (${result.scoreType})`}
          >
            {formatScore()}
          </span>
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Copy passage content"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Chunk Content Excerpt */}
      <div className="bg-slate-50/75 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800/80">
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line">
          {result.content}
        </p>
      </div>

      {/* Source Citation */}
      <SourceCitation citation={result.citation} />
    </div>
  );
};
