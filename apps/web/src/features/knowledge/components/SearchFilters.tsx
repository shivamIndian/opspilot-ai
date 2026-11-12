import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface SearchFiltersProps {
  topK: number;
  onTopKChange: (topK: number) => void;
  selectedFileType: string | null;
  onFileTypeChange: (fileType: string | null) => void;
  disabled?: boolean;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  topK,
  onTopKChange,
  selectedFileType,
  onFileTypeChange,
  disabled = false,
}) => {
  const topKOptions = [3, 5, 10, 20];
  const fileTypeOptions = [
    { id: null, label: 'All Files' },
    { id: 'pdf', label: 'PDF' },
    { id: 'docx', label: 'DOCX' },
    { id: 'md', label: 'Markdown' },
    { id: 'txt', label: 'Text' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      {/* TopK Selection */}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Top Results:
        </span>
        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
          {topKOptions.map(k => (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => onTopKChange(k)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                topK === k
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* File Type Filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500 dark:text-slate-400 font-medium">Type:</span>
        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
          {fileTypeOptions.map(opt => {
            const isSelected = selectedFileType === opt.id;
            return (
              <button
                key={opt.label}
                type="button"
                disabled={disabled}
                onClick={() => onFileTypeChange(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
