import React from 'react';
import {
  Database,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Server,
  Cpu,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatBytes } from '@/features/documents/utils/document-formatters';
import type { SafeDocument } from '@/types/document';

export interface VectorIndexHealthPanelProps {
  organizationId: string;
  documents: SafeDocument[];
  isLoading?: boolean;
  onReprocessDocument: (doc: SafeDocument) => Promise<void>;
  onReprocessEmbeddings: (doc: SafeDocument) => Promise<void>;
  canManage: boolean;
}

export const VectorIndexHealthPanel: React.FC<VectorIndexHealthPanelProps> = ({
  organizationId: _organizationId,
  documents,
  isLoading: _isLoading = false,
  onReprocessDocument,
  onReprocessEmbeddings,
  canManage,
}) => {
  // Compute health aggregates from real document records
  const activeDocs = documents.filter((d) => d.status === 'active');

  const processingCompleted = activeDocs.filter((d) => d.processingStatus === 'completed').length;
  const processingBusy = activeDocs.filter(
    (d) => d.processingStatus === 'processing' || d.processingStatus === 'queued'
  ).length;
  const processingPending = activeDocs.filter(
    (d) => d.processingStatus === 'pending' || !d.processingStatus
  ).length;
  const processingFailed = activeDocs.filter((d) => d.processingStatus === 'failed');

  const embeddingCompleted = activeDocs.filter((d) => d.embeddingStatus === 'completed').length;
  const embeddingBusy = activeDocs.filter(
    (d) => d.embeddingStatus === 'processing' || d.embeddingStatus === 'queued'
  ).length;
  const embeddingPending = activeDocs.filter(
    (d) => d.embeddingStatus === 'pending' || !d.embeddingStatus
  ).length;
  const embeddingFailed = activeDocs.filter((d) => d.embeddingStatus === 'failed');

  const totalChunks = activeDocs.reduce((acc, d) => acc + (d.chunkCount || 0), 0);
  const totalEmbeddedChunks = activeDocs.reduce(
    (acc, d) => acc + (d.embeddedChunkCount || (d.embeddingStatus === 'completed' ? d.chunkCount || 0 : 0)),
    0
  );
  const totalStorageBytes = documents.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);

  const indexingRate =
    activeDocs.length > 0 ? Math.round((embeddingCompleted / activeDocs.length) * 100) : 100;

  const failedDocuments = activeDocs.filter(
    (d) => d.processingStatus === 'failed' || d.embeddingStatus === 'failed'
  );

  return (
    <div className="space-y-6">
      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vector DB Engine */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Vector Store</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-[var(--text-primary)]">PostgreSQL pgvector</div>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              1,536-dim Cosine Distance (<span className="font-mono">&lt;=&gt;</span>)
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--border-default)] flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-secondary)]">Index Space</span>
            <Badge variant="success" size="sm">
              Active HNSW
            </Badge>
          </div>
        </div>

        {/* Embedded Chunks */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Embeddings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-[var(--text-primary)]">
              {totalEmbeddedChunks.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[var(--text-secondary)]">
                / {totalChunks.toLocaleString()} chunks
              </span>
            </div>
            <div className="w-full bg-[var(--surface-secondary)] rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${indexingRate}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--border-default)] flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-secondary)]">Coverage</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{indexingRate}% indexed</span>
          </div>
        </div>

        {/* Ingestion Pipeline Status */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Pipeline Ingestion</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-[var(--text-primary)]">
              {processingCompleted}{' '}
              <span className="text-xs font-normal text-[var(--text-secondary)]">
                / {activeDocs.length} active
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              {processingBusy > 0
                ? `${processingBusy} documents in queue/parsing`
                : 'All documents parsed successfully'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--border-default)] flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-secondary)]">Worker Queue</span>
            <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              BullMQ Active
            </span>
          </div>
        </div>

        {/* Failed Documents & Health */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Attention Needed</span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                failedDocuments.length > 0
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {failedDocuments.length > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-[var(--text-primary)]">
              {failedDocuments.length}{' '}
              <span className="text-xs font-normal text-[var(--text-secondary)]">issues</span>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              {failedDocuments.length > 0
                ? `${failedDocuments.length} documents require manual retry`
                : 'Zero ingestion or embedding failures'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[var(--border-default)] flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-secondary)]">Storage Footprint</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {formatBytes(totalStorageBytes)}
            </span>
          </div>
        </div>
      </div>

      {/* Deep Pipeline Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Parsing Pipeline Stage */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2.5">
              <Server className="h-4 w-4 text-[var(--brand-primary)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Stage 1: Document Parsing & Chunking
              </h3>
            </div>
            <Badge variant="neutral" size="sm">
              Python FastAPI Engine
            </Badge>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Extracts raw text, strips metadata, sections content into overlapping chunks with
            sliding-window token boundaries, and persists chunks in database.
          </p>

          <div className="grid grid-cols-4 gap-2 pt-2 text-center">
            <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 border border-emerald-200/50 dark:border-emerald-900/30">
              <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                {processingCompleted}
              </div>
              <div className="text-[10px] text-emerald-600/80 dark:text-emerald-500 font-medium mt-0.5">
                Completed
              </div>
            </div>
            <div className="rounded-xl bg-blue-50/50 dark:bg-blue-950/20 p-2.5 border border-blue-200/50 dark:border-blue-900/30">
              <div className="text-base font-bold text-blue-700 dark:text-blue-400">
                {processingBusy}
              </div>
              <div className="text-[10px] text-blue-600/80 dark:text-blue-500 font-medium mt-0.5">
                In Flight
              </div>
            </div>
            <div className="rounded-xl bg-slate-50/50 dark:bg-slate-900/20 p-2.5 border border-slate-200/50 dark:border-slate-800">
              <div className="text-base font-bold text-slate-700 dark:text-slate-400">
                {processingPending}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Pending</div>
            </div>
            <div className="rounded-xl bg-red-50/50 dark:bg-red-950/20 p-2.5 border border-red-200/50 dark:border-red-900/30">
              <div className="text-base font-bold text-red-700 dark:text-red-400">
                {processingFailed.length}
              </div>
              <div className="text-[10px] text-red-600/80 dark:text-red-500 font-medium mt-0.5">
                Failed
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--surface-secondary)] p-3 text-[11px] text-[var(--text-secondary)] space-y-1">
            <div className="flex justify-between">
              <span>Supported Formats:</span>
              <span className="font-semibold text-[var(--text-primary)]">PDF, DOCX, TXT, Markdown</span>
            </div>
            <div className="flex justify-between">
              <span>Chunk Strategy:</span>
              <span className="font-semibold text-[var(--text-primary)]">Recursive Text Splitting (500 tokens)</span>
            </div>
          </div>
        </div>

        {/* Vector Embedding Generation Stage */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Stage 2: Vector Embedding & Indexing
              </h3>
            </div>
            <Badge variant="neutral" size="sm">
              OpenAI / pgvector
            </Badge>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Generates 1,536-dimensional normalized embeddings for each text chunk using OpenAI's
            model and writes vector records to the PostgreSQL vector table.
          </p>

          <div className="grid grid-cols-4 gap-2 pt-2 text-center">
            <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 border border-emerald-200/50 dark:border-emerald-900/30">
              <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                {embeddingCompleted}
              </div>
              <div className="text-[10px] text-emerald-600/80 dark:text-emerald-500 font-medium mt-0.5">
                Completed
              </div>
            </div>
            <div className="rounded-xl bg-purple-50/50 dark:bg-purple-950/20 p-2.5 border border-purple-200/50 dark:border-purple-900/30">
              <div className="text-base font-bold text-purple-700 dark:text-purple-400">
                {embeddingBusy}
              </div>
              <div className="text-[10px] text-purple-600/80 dark:text-purple-500 font-medium mt-0.5">
                Embedding
              </div>
            </div>
            <div className="rounded-xl bg-slate-50/50 dark:bg-slate-900/20 p-2.5 border border-slate-200/50 dark:border-slate-800">
              <div className="text-base font-bold text-slate-700 dark:text-slate-400">
                {embeddingPending}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Pending</div>
            </div>
            <div className="rounded-xl bg-red-50/50 dark:bg-red-950/20 p-2.5 border border-red-200/50 dark:border-red-900/30">
              <div className="text-base font-bold text-red-700 dark:text-red-400">
                {embeddingFailed.length}
              </div>
              <div className="text-[10px] text-red-600/80 dark:text-red-500 font-medium mt-0.5">
                Failed
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--surface-secondary)] p-3 text-[11px] text-[var(--text-secondary)] space-y-1">
            <div className="flex justify-between">
              <span>Embedding Model:</span>
              <span className="font-semibold text-[var(--text-primary)]">text-embedding-3-small</span>
            </div>
            <div className="flex justify-between">
              <span>Vector Dimensions:</span>
              <span className="font-semibold text-[var(--text-primary)]">1,536 dimensions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Issues & Failed Documents Remediation */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`h-4 w-4 ${
                failedDocuments.length > 0 ? 'text-amber-500' : 'text-emerald-500'
              }`}
            />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Document Health & Remediation Queue ({failedDocuments.length})
            </h3>
          </div>
          {failedDocuments.length === 0 && (
            <Badge variant="success" size="sm">
              All Systems Operational
            </Badge>
          )}
        </div>

        {failedDocuments.length > 0 ? (
          <div className="divide-y divide-[var(--border-default)] border border-[var(--border-default)] rounded-xl overflow-hidden">
            {failedDocuments.map((doc) => {
              const isParseFailed = doc.processingStatus === 'failed';
              const isEmbFailed = doc.embeddingStatus === 'failed';
              return (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[var(--surface-primary)] hover:bg-[var(--surface-secondary)]/50 gap-3 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {doc.displayName || doc.originalFilename}
                      </div>
                      <div className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-2">
                        {isParseFailed && (
                          <span>Parsing Error: {doc.processingErrorCode || 'Extraction failed'}</span>
                        )}
                        {isEmbFailed && (
                          <span>Embedding Error: {doc.embeddingErrorCode || 'Vector failure'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isParseFailed && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onReprocessDocument(doc)}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Retry Parsing</span>
                        </Button>
                      )}
                      {isEmbFailed && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onReprocessEmbeddings(doc)}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Retry Embeddings</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-[var(--surface-secondary)]/40 border border-dashed border-[var(--border-default)]">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
            <h4 className="text-xs font-semibold text-[var(--text-primary)]">
              No Processing or Vector Index Issues
            </h4>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm">
              All {activeDocs.length} active documents in this organization are fully processed and
              indexed in the pgvector database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
