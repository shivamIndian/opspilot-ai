import React from 'react';
import { FileText, Bookmark, Hash } from 'lucide-react';
import type { KnowledgeSearchCitation } from '@/types/knowledge';

interface SourceCitationProps {
  citation: KnowledgeSearchCitation;
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ citation }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
      {/* Document Name */}
      <div className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
        <FileText className="w-3.5 h-3.5 text-indigo-500" />
        <span className="truncate max-w-[200px]" title={citation.documentName}>
          {citation.documentName}
        </span>
        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-mono font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {citation.fileExtension}
        </span>
      </div>

      {/* Page Number (if available) */}
      {citation.pageStart !== null && (
        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
          • Page {citation.pageStart}
          {citation.pageEnd !== null &&
            citation.pageEnd !== citation.pageStart &&
            `-${citation.pageEnd}`}
        </span>
      )}

      {/* Section Heading (if available) */}
      {citation.sectionTitle && (
        <span
          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[220px]"
          title={citation.sectionTitle}
        >
          • <Bookmark className="w-3 h-3 shrink-0" />
          <span className="truncate">{citation.sectionTitle}</span>
        </span>
      )}

      {/* Chunk Index */}
      <span className="inline-flex items-center gap-0.5 text-slate-400 font-mono text-[10px] ml-auto">
        <Hash className="w-2.5 h-2.5" />
        Chunk {citation.chunkIndex + 1}
      </span>
    </div>
  );
};
