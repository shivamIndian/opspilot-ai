import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Sparkles,
  Layers,
  Upload,
  HardDrive,
  Files,
  Search,
  AlertCircle,
} from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAuth } from '@/hooks/useAuth';
import {
  useDocumentList,
  useArchiveDocument,
  useRestoreDocument,
  useReprocessDocument,
  useReprocessEmbeddings,
} from '@/features/documents/hooks/useDocuments';
import { useKnowledgeSearch } from '../hooks/useKnowledgeSearch';
import { useKnowledgeAnswer } from '../hooks/useKnowledgeAnswer';
import type { SafeDocument, DocumentFilterParams } from '@/features/documents/types/document.types';
import type { RetrievalMode } from '@/types/knowledge';

// Subcomponents
import { DocumentFilters } from '@/features/documents/components/DocumentFilters';
import { DocumentTable } from '@/features/documents/components/DocumentTable';
import { DocumentUploadDialog } from '@/features/documents/components/DocumentUploadDialog';
import { DocumentDetailsDialog } from '@/features/documents/components/DocumentDetailsDialog';
import { DocumentEditDialog } from '@/features/documents/components/DocumentEditDialog';
import { KnowledgeSearchBar } from '../components/KnowledgeSearchBar';
import { RetrievalModeSelector } from '../components/RetrievalModeSelector';
import { SearchFilters } from '../components/SearchFilters';
import { SearchResultCard } from '../components/SearchResultCard';
import { SearchLoadingState } from '../components/SearchLoadingState';
import { NoSearchResults } from '../components/NoSearchResults';
import { ContextPreviewModal } from '../components/ContextPreviewModal';
import { GeneratedAnswerCard } from '../components/GeneratedAnswerCard';
import { AnswerGenerationStatus } from '../components/AnswerGenerationStatus';
import { VectorIndexHealthPanel } from '../components/VectorIndexHealthPanel';
import { formatBytes } from '@/features/documents/utils/document-formatters';
import { Button } from '@/components/ui/Button';

export type KnowledgeTab = 'documents' | 'search' | 'health';

export interface KnowledgeBasePageProps {
  defaultTab?: KnowledgeTab;
}

export const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({
  defaultTab = 'documents',
}) => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeOrganization } = useOrganizations();
  const { user } = useAuth();

  // Active tab state synced with URL query parameter
  const tabParam = searchParams.get('tab') as KnowledgeTab | null;
  const activeTab: KnowledgeTab =
    tabParam === 'documents' || tabParam === 'search' || tabParam === 'health'
      ? tabParam
      : defaultTab;

  const setActiveTab = (tab: KnowledgeTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  // --- Document Management State ---
  const [docFilters, setDocFilters] = useState<DocumentFilterParams>({
    page: 1,
    limit: 20,
    status: 'active',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDetailsDoc, setSelectedDetailsDoc] = useState<SafeDocument | null>(null);
  const [selectedEditDoc, setSelectedEditDoc] = useState<SafeDocument | null>(null);

  const {
    data: documentData,
    isLoading: isLoadingDocs,
    refetch: refetchDocs,
  } = useDocumentList(organizationId, docFilters);

  const archiveMutation = useArchiveDocument(organizationId);
  const restoreMutation = useRestoreDocument(organizationId);
  const reprocessMutation = useReprocessDocument(organizationId);
  const reprocessEmbeddingsMutation = useReprocessEmbeddings(organizationId);

  const userRole = activeOrganization?.role;
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
  const canManage = isOwnerOrAdmin;

  const handleReprocess = async (doc: SafeDocument) => {
    try {
      await reprocessMutation.mutateAsync(doc.id);
    } catch (err) {
      console.error('Failed to trigger reprocessing:', err);
    }
  };

  const handleReprocessEmbeddings = async (doc: SafeDocument) => {
    try {
      await reprocessEmbeddingsMutation.mutateAsync(doc.id);
    } catch (err) {
      console.error('Failed to trigger embedding reprocessing:', err);
    }
  };

  const handleArchive = async (doc: SafeDocument) => {
    try {
      await archiveMutation.mutateAsync(doc.id);
    } catch (err) {
      console.error('Failed to archive document:', err);
    }
  };

  const handleRestore = async (doc: SafeDocument) => {
    try {
      await restoreMutation.mutateAsync(doc.id);
    } catch (err) {
      console.error('Failed to restore document:', err);
    }
  };

  // --- Search & Ask AI State ---
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>('hybrid');
  const [topK, setTopK] = useState<number>(5);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState('');

  const searchMutation = useKnowledgeSearch(organizationId);
  const answerMutation = useKnowledgeAnswer(organizationId || '');

  const handleSearch = (query: string) => {
    setLastSubmittedQuery(query);
    answerMutation.reset();
    searchMutation.mutate({
      query,
      topK,
      retrievalMode,
      filters: selectedFileType ? { fileTypes: [selectedFileType] } : undefined,
    });
  };

  const handleAskAI = (query: string) => {
    setLastSubmittedQuery(query);
    searchMutation.mutate({
      query,
      topK,
      retrievalMode,
      filters: selectedFileType ? { fileTypes: [selectedFileType] } : undefined,
    });
    answerMutation.mutate({
      query,
      topK,
      retrievalMode,
      filters: selectedFileType ? { fileTypes: [selectedFileType] } : undefined,
    });
  };

  const documents = documentData?.documents || [];
  const pagination = documentData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  // Calculate quick metrics
  const activeCount = documents.filter((d) => d.status === 'active').length;
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0);
  const totalStorageBytes = documents.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);
  const failedCount = documents.filter(
    (d) => d.processingStatus === 'failed' || d.embeddingStatus === 'failed'
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Navigation Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] shadow-sm">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Enterprise Knowledge Base
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Grounded runbooks, pgvector hybrid retrieval, and autonomous agent tool knowledge.
            </p>
          </div>
        </div>

        {/* Global Hub Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveTab('search')}
            className="flex items-center gap-1.5 text-xs shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            <span>Ask Knowledge AI</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 text-xs shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-[var(--border-default)] gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'documents'
              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Documents Catalog</span>
          <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
            {pagination.total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'search'
              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Semantic Search & Ask AI</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'health'
              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Vector Index & Health</span>
          {failedCount > 0 ? (
            <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 text-[10px] font-bold">
              {failedCount}
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
              Healthy
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Documents Catalog */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Files className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  {pagination.total}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">Total Documents</div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{activeCount}</div>
                <div className="text-[11px] text-[var(--text-secondary)]">Active in RAG</div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  {totalChunks.toLocaleString()}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">Extracted Chunks</div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  {formatBytes(totalStorageBytes)}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">Total Storage</div>
              </div>
            </div>
          </div>

          {/* Document Filters */}
          <DocumentFilters
            filters={docFilters}
            onFilterChange={(newFilters) =>
              setDocFilters((prev) => ({ ...prev, ...newFilters, page: 1 }))
            }
            onReset={() =>
              setDocFilters({
                page: 1,
                limit: 20,
                status: 'active',
                sortBy: 'created_at',
                sortOrder: 'desc',
              })
            }
          />

          {/* Documents Table */}
          <DocumentTable
            organizationId={organizationId || ''}
            documents={documents}
            pagination={pagination}
            isLoading={isLoadingDocs}
            onPageChange={(page) => setDocFilters((prev) => ({ ...prev, page }))}
            onSortChange={(sortBy) =>
              setDocFilters((prev) => ({
                ...prev,
                sortBy,
                sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
              }))
            }
            currentSortBy={docFilters.sortBy}
            currentSortOrder={docFilters.sortOrder}
            onViewDetails={(doc: SafeDocument) => {
              navigate(`/organizations/${organizationId}/knowledge/documents/${doc.id}`);
            }}
            onEdit={(doc: SafeDocument) => setSelectedEditDoc(doc)}
            onReprocess={handleReprocess}
            onReprocessEmbeddings={handleReprocessEmbeddings}
            onArchive={handleArchive}
            onRestore={handleRestore}
            currentUserId={user?.id}
            userRole={userRole}
          />
        </div>
      )}

      {/* TAB 2: Semantic Search & Ask AI */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span>Hybrid Vector Search & RAG Answer Engine</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Query organizational knowledge using natural language. Choose between hybrid
              (reciprocal rank fusion), pure semantic (cosine distance), or keyword matching.
            </p>

            <KnowledgeSearchBar
              onSearch={handleSearch}
              onAskAI={handleAskAI}
              isLoading={searchMutation.isPending || answerMutation.isPending}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <RetrievalModeSelector mode={retrievalMode} onChange={setRetrievalMode} />
              <SearchFilters
                selectedFileType={selectedFileType}
                onFileTypeChange={setSelectedFileType}
                topK={topK}
                onTopKChange={setTopK}
              />
            </div>
          </div>

          {/* Search Error State */}
          {searchMutation.isError && !searchMutation.isPending && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold text-red-400">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>Search Failed</span>
              </div>
              <p className="text-xs text-red-300/90 leading-relaxed">
                {(searchMutation.error as any)?.response?.data?.error?.message ||
                  (searchMutation.error as Error)?.message ||
                  'An unexpected error occurred during search. Please check your network and try again.'}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSearch(lastSubmittedQuery)}
                className="text-xs mt-1"
              >
                Retry Search
              </Button>
            </div>
          )}

          {/* Ask AI Answer Generation Status & Result Card */}
          {answerMutation.isPending && (
            <AnswerGenerationStatus query={lastSubmittedQuery} />
          )}

          {answerMutation.isError && !answerMutation.isPending && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold text-red-400">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>AI Answer Generation Failed</span>
              </div>
              <p className="text-xs text-red-300/90 leading-relaxed">
                {(answerMutation.error as any)?.response?.data?.error?.message ||
                  (answerMutation.error as Error)?.message ||
                  'An unexpected error occurred while generating the answer. Please try again.'}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAskAI(lastSubmittedQuery)}
                className="text-xs mt-1"
              >
                Retry AI Generation
              </Button>
            </div>
          )}

          {answerMutation.data && (
            <GeneratedAnswerCard
              response={answerMutation.data}
              onAskFollowUp={handleAskAI}
            />
          )}

          {/* Search Retrieval Results */}
          {searchMutation.isPending && <SearchLoadingState />}

          {searchMutation.data && !searchMutation.isPending && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>
                  Found{' '}
                  <strong className="text-[var(--text-primary)]">
                    {searchMutation.data.results.length}
                  </strong>{' '}
                  relevant passages in {searchMutation.data.diagnostics.totalDurationMs}ms
                </span>
                <span className="font-mono text-[11px]">
                  Mode: {searchMutation.data.retrievalMode}
                </span>
              </div>

              {searchMutation.data.results.length > 0 ? (
                <div className="space-y-3">
                  {searchMutation.data.results.map((result) => (
                    <SearchResultCard
                      key={result.chunkId}
                      result={result}
                    />
                  ))}
                </div>
              ) : (
                <NoSearchResults query={lastSubmittedQuery} />
              )}
            </div>
          )}

          {/* Context Modal for Inspecting Grounding Chunks */}
          {searchMutation.data?.context && (
            <ContextPreviewModal
              isOpen={isContextModalOpen}
              onClose={() => setIsContextModalOpen(false)}
              context={searchMutation.data.context}
            />
          )}
        </div>
      )}

      {/* TAB 3: Vector Index & Engine Health */}
      {activeTab === 'health' && (
        <VectorIndexHealthPanel
          organizationId={organizationId || ''}
          documents={documents}
          isLoading={isLoadingDocs}
          onReprocessDocument={handleReprocess}
          onReprocessEmbeddings={handleReprocessEmbeddings}
          canManage={canManage}
        />
      )}

      {/* Upload Dialog */}
      <DocumentUploadDialog
        organizationId={organizationId || ''}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          setIsUploadOpen(false);
          refetchDocs();
        }}
      />

      {/* Details Dialog */}
      <DocumentDetailsDialog
        organizationId={organizationId || ''}
        document={selectedDetailsDoc}
        isOpen={Boolean(selectedDetailsDoc)}
        onClose={() => setSelectedDetailsDoc(null)}
        onEdit={(doc: SafeDocument) => {
          setSelectedDetailsDoc(null);
          setSelectedEditDoc(doc);
        }}
        onArchive={handleArchive}
        onRestore={handleRestore}
        canManage={canManage}
        canEdit={canManage}
      />

      {/* Edit Metadata Dialog */}
      <DocumentEditDialog
        organizationId={organizationId || ''}
        document={selectedEditDoc}
        isOpen={Boolean(selectedEditDoc)}
        onClose={() => setSelectedEditDoc(null)}
      />
    </div>
  );
};
