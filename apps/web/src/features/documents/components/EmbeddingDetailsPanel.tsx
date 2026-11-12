import React from 'react';
import { Sparkles, Database, Layers, RotateCcw, Loader2, AlertCircle, Hash } from 'lucide-react';
import type { SafeDocument } from '../types/document.types';
import { EmbeddingStatusBadge } from './EmbeddingStatusBadge';
import { useDocumentEmbeddingStatus, useReprocessEmbeddings } from '../hooks/useDocuments';
import { formatDocumentDate } from '../utils/document-formatters';

interface EmbeddingDetailsPanelProps {
  organizationId: string;
  document: SafeDocument;
  canManage: boolean;
}

export const EmbeddingDetailsPanel: React.FC<EmbeddingDetailsPanelProps> = ({
  organizationId,
  document,
  canManage,
}) => {
  const { data: liveStatus, isLoading } = useDocumentEmbeddingStatus(organizationId, document.id);
  const reprocessMutation = useReprocessEmbeddings(organizationId);

  const status = liveStatus?.status || document.embeddingStatus || 'pending';
  const generation = liveStatus?.generation ?? document.embeddingGeneration ?? 0;
  const embeddedCount = liveStatus?.embeddedChunkCount ?? document.embeddedChunkCount ?? 0;
  const totalChunks = document.chunkCount || 0;
  const provider = liveStatus?.provider || document.embeddingProvider || 'openai';
  const model = liveStatus?.model || document.embeddingModel || 'text-embedding-3-small';
  const dimensions = liveStatus?.dimensions ?? document.embeddingDimensions ?? 1536;
  const embeddedAt = liveStatus?.embeddedAt ?? document.embeddedAt;
  const errorCode = liveStatus?.errorCode ?? document.embeddingErrorCode;

  const isBusy = status === 'processing' || status === 'queued';
  const isExtracted = document.processingStatus === 'completed';

  const handleReprocess = async () => {
    if (isBusy || !canManage || !isExtracted) return;
    try {
      await reprocessMutation.mutateAsync(document.id);
    } catch (err) {
      console.error('Failed to trigger embedding reprocessing:', err);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Vector Embedding (pgvector)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
          <EmbeddingStatusBadge status={status} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span>Embedded Chunks</span>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
            {embeddedCount} / {totalChunks}
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
            <Database className="w-3.5 h-3.5 text-teal-500" />
            <span>Dimensions</span>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
            {dimensions}d
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
            <Hash className="w-3.5 h-3.5 text-indigo-500" />
            <span>Model</span>
          </div>
          <p
            className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono truncate"
            title={model}
          >
            {model}
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
            <span className="font-semibold">Embedding Failure ({errorCode}): </span>
            <span>
              {errorCode === 'EMBEDDING_AUTHENTICATION_FAILED'
                ? 'Provider API key is invalid or unauthorized.'
                : errorCode === 'EMBEDDING_QUOTA_EXCEEDED'
                  ? 'Embedding provider quota is exhausted.'
                  : errorCode === 'DOCUMENT_NOT_EXTRACTED'
                    ? 'Document text extraction must succeed before embeddings can be generated.'
                    : errorCode === 'EMBEDDING_DIMENSION_MISMATCH'
                      ? 'Returned embedding vectors do not match the expected 1536-dimensional schema.'
                      : 'An error occurred during embedding generation or vector storage.'}
            </span>
          </div>
        </div>
      )}

      {/* Footer Info & Reprocess Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div>
          <span>Provider: </span>
          <span className="font-mono text-slate-700 dark:text-slate-300 uppercase">{provider}</span>
          {embeddedAt && <span className="ml-2">• Embedded {formatDocumentDate(embeddedAt)}</span>}
        </div>

        {canManage && document.status === 'active' && isExtracted && (
          <button
            type="button"
            onClick={handleReprocess}
            disabled={isBusy || reprocessMutation.isPending}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/50 rounded-lg disabled:opacity-50 transition"
          >
            {isBusy || reprocessMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>{status === 'completed' ? 'Regenerate Vectors' : 'Generate Vectors'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
