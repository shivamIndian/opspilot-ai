import React, { useState } from 'react';
import { X, Copy, Check, ShieldAlert, FileText, Code2 } from 'lucide-react';
import type { KnowledgeContext } from '@/types/knowledge';

interface ContextPreviewModalProps {
  context: KnowledgeContext | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ContextPreviewModal: React.FC<ContextPreviewModalProps> = ({
  context,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !context) return null;

  // Format passages to the LLM prompt markdown block
  const markdownText = context.passages
    .map(p => {
      const locDetails: string[] = [];
      if (p.page !== null) locDetails.push(`Page ${p.page}`);
      if (p.section) locDetails.push(`Section: "${p.section}"`);
      const locStr = locDetails.length > 0 ? ` (${locDetails.join(', ')})` : '';
      return `[Source ${p.sourceNumber}: ${p.documentName}${locStr}]\n${p.text}`;
    })
    .join('\n\n---\n\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Assembled RAG Context Package
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Structured reference payload prepared for downstream Module 10 LLM prompt injection
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subheader metrics */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              {context.passages.length} Passages
            </span>
            <span>• {context.sourceCount} Unique Documents</span>
            <span>• {context.totalChars.toLocaleString()} Total Characters</span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied Payload</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Security Notice Alert */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p className="leading-relaxed">{context.trustNotice}</p>
          </div>

          {/* Formatted Text Block */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assembled Prompt Injection Block
            </label>
            <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-slate-800 max-h-[400px]">
              {markdownText || '(No passages retrieved)'}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
