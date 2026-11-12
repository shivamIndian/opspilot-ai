import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type {
  DocumentFilterParams,
  DocumentStatus,
  DocumentExtension,
} from '../types/document.types';

interface DocumentFiltersProps {
  filters: DocumentFilterParams;
  onFilterChange: (filters: Partial<DocumentFilterParams>) => void;
  onReset: () => void;
}

export const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.fileType || filters.dateFrom || filters.dateTo
  );

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 mb-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={e => onFilterChange({ search: e.target.value || undefined, page: 1 })}
            placeholder="Search documents by name or filename..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={filters.status || 'active'}
            onChange={e =>
              onFilterChange({
                status: (e.target.value as DocumentStatus) || undefined,
                page: 1,
              })
            }
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="active">Active Documents</option>
            <option value="archived">Archived Documents</option>
          </select>

          {/* File Type Filter */}
          <select
            value={filters.fileType || ''}
            onChange={e =>
              onFilterChange({
                fileType: (e.target.value as DocumentExtension) || undefined,
                page: 1,
              })
            }
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">All Types (.pdf, .docx, .txt, .md)</option>
            <option value="pdf">PDF (.pdf)</option>
            <option value="docx">Word (.docx)</option>
            <option value="txt">Text (.txt)</option>
            <option value="md">Markdown (.md)</option>
          </select>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
