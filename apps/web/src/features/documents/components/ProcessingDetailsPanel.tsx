import React from 'react';
import { Cpu, Layers, FileText, RotateCcw, Loader2, AlertCircle, Hash } from 'lucide-react';
import type { SafeDocument } from '../types/document.types';
import { ProcessingStatusBadge } from './ProcessingStatusBadge';
import { useDocumentProcessingStatus, useReprocessDocument } from '../hooks/useDocuments';
import { formatDocumentDate } from '../utils/document-formatters';

interface ProcessingDetailsPanelProps {
  organizationId: string;
  document: SafeDocument;
  canManage: boolean;
}

export const ProcessingDetailsPanel: React.FC<ProcessingDetailsPanelProps> = ({
  organizationId,
  document,
  canManage,
}) => {
  const { data: liveStatus, isLoading } = useDocumentProcessingStatus(organizationId, document.id);
  const reprocessMutation = useReprocessDocument(organizationId);

  const status = liveStatus?.status || document.processingStatus || 'pending';
  const generation = liveStatus?.generation ?? document.processingGeneration ?? 1;
  const chunkCount = liveStatus?.chunkCount ?? document.chunkCount ?? 0;
  const pageCount = liveStatus?.pageCount ?? document.pageCount;
  const extractedCharCount = liveStatus?.extractedCharCount ?? document.extractedCharCount;
  const processedAt = liveStatus?.processedAt ?? document.processedAt;
  const errorCode = liveStatus?.errorCode ?? document.processingErrorCode;
  const pipelineVersion = liveStatus?.pipelineVersion ?? document.processingPipelineVersion;

  const isBusy = status === 'processing' || status === 'queued';

  const handleReprocess = async () => {
    if (isBusy || !canManage) return;
    try {
      await reprocessMutation.mutateAsync(document.id);
    } catch (err) {
      console.error('Failed to trigger reprocessing:', err);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-500" />
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            AI Ingestion Pipeline
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
          <ProcessingStatusBadge status={status} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Chunks</span>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
            {chunkCount}
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>Pages</span>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
            {pageCount !== null && pageCount !== undefined ? pageCount : '—'}
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
            <Hash className="w-3.5 h-3.5 text-emerald-500" />
            <span>Characters</span>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
            {extractedCharCount ? extractedCharCount.toLocaleString() : '—'}
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
            <span>Generation</span>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
            v{generation}
          </p>
        </div>
      </div>

      {/* Error Message if failed */}
      {errorCode && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Processing Failure ({errorCode}): </span>
            <span>
              {errorCode === 'NO_EXTRACTABLE_TEXT'
                ? 'Document does not contain extractable text (e.g., scanned image PDF).'
                : errorCode === 'ENCRYPTED_PDF_UNSUPPORTED'
                  ? 'Password-protected or encrypted PDFs are unsupported.'
                  : errorCode === 'DOCUMENT_PAGE_LIMIT_EXCEEDED'
                    ? 'Document exceeds maximum allowable page limit.'
                    : errorCode === 'UNSUPPORTED_FILE_TYPE'
                      ? 'The file format is not supported for extraction.'
                      : 'An error occurred during text extraction or chunk generation.'}
            </span>
          </div>
        </div>
      )}

      {/* Footer Info & Reprocess Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div>
          <span>Pipeline: </span>
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {pipelineVersion || 'document-pipeline-v1'}
          </span>
          {processedAt && (
            <span className="ml-2">• Processed {formatDocumentDate(processedAt)}</span>
          )}
        </div>

        {canManage && document.status === 'active' && (
          <button
            type="button"
            onClick={handleReprocess}
            disabled={isBusy || reprocessMutation.isPending}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/50 rounded-lg disabled:opacity-50 transition"
          >
            {isBusy || reprocessMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>Reprocess Document</span>
          </button>
        )}
      </div>
    </div>
  );
};
