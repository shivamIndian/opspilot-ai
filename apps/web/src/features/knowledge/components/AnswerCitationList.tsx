import React from 'react';
import { BookOpen, FileText } from 'lucide-react';
import type { AnswerCitation } from '@/types/knowledge';

interface AnswerCitationListProps {
  citations: AnswerCitation[];
}

export const AnswerCitationList: React.FC<AnswerCitationListProps> = ({ citations }) => {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        <BookOpen className="h-4 w-4" />
        <span>Verified Citations ({citations.length})</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {citations.map(c => {
          const pageLabel =
            c.pageStart && c.pageEnd && c.pageStart !== c.pageEnd
              ? `pp. ${c.pageStart}–${c.pageEnd}`
              : c.pageStart
                ? `p. ${c.pageStart}`
                : null;

          return (
            <div
              key={c.sourceId}
              className="group flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-xs transition-colors hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-blue-700"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                    [{c.sourceId}]
                  </span>
                  {c.relevanceScore !== null && c.relevanceScore !== undefined && (
                    <span className="text-2xs font-mono text-gray-400">
                      Score: {c.relevanceScore.toFixed(3)}
                    </span>
                  )}
                </div>

                <div className="flex items-start space-x-2">
                  <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  <p className="line-clamp-1 text-xs font-medium text-gray-800 dark:text-gray-200">
                    {c.documentName}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 text-2xs text-gray-500 dark:text-gray-400">
                  {pageLabel && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                      {pageLabel}
                    </span>
                  )}
                  {c.sectionTitle && (
                    <span className="max-w-[140px] truncate rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                      {c.sectionTitle}
                    </span>
                  )}
                  <span className="uppercase text-gray-400">.{c.fileExtension}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
