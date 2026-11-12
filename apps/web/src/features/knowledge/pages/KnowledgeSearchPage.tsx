import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Compass, FileText, Clock, Layers, Code2, AlertTriangle, Sparkles } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useKnowledgeSearch } from '../hooks/useKnowledgeSearch';
import { useKnowledgeAnswer } from '../hooks/useKnowledgeAnswer';
import { KnowledgeSearchBar } from '../components/KnowledgeSearchBar';
import { RetrievalModeSelector } from '../components/RetrievalModeSelector';
import { SearchFilters } from '../components/SearchFilters';
import { SearchResultCard } from '../components/SearchResultCard';
import { SearchLoadingState } from '../components/SearchLoadingState';
import { NoSearchResults } from '../components/NoSearchResults';
import { ContextPreviewModal } from '../components/ContextPreviewModal';
import { GeneratedAnswerCard } from '../components/GeneratedAnswerCard';
import { AnswerGenerationStatus } from '../components/AnswerGenerationStatus';
import type { RetrievalMode } from '@/types/knowledge';

export const KnowledgeSearchPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { activeOrganization } = useOrganizations();

  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>('hybrid');
  const [topK, setTopK] = useState<number>(5);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState('');

  const searchMutation = useKnowledgeSearch(organizationId);
  const answerMutation = useKnowledgeAnswer(organizationId || '');

  const handleSearch = (query: string) => {
    setLastSubmittedQuery(query);
    searchMutation.mutate({
      query,
      topK,
      retrievalMode,
      filters: selectedFileType ? { fileTypes: [selectedFileType] } : undefined,
    });
  };

  const handleAskAI = (query: string) => {
    setLastSubmittedQuery(query);
    // Also trigger standard retrieval search in parallel if not already loaded
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

  const responseData = searchMutation.data;
  const isInitialState =
    !searchMutation.isPending &&
    !searchMutation.data &&
    !searchMutation.isError &&
    !answerMutation.isPending &&
    !answerMutation.data;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Enterprise Knowledge Search & AI Intelligence
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            RAG retrieval and evidence-grounded answer generation for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {activeOrganization?.name || 'Organization'}
            </span>
          </p>
        </div>

        <Link
          to={`/organizations/${organizationId}/documents`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-500" />
          <span>Document Library</span>
        </Link>
      </div>

      {/* Search Input Box */}
      <div className="space-y-3">
        <KnowledgeSearchBar
          onSearch={handleSearch}
          onAskAI={handleAskAI}
          isLoading={searchMutation.isPending}
          isGeneratingAnswer={answerMutation.isPending}
          initialQuery={lastSubmittedQuery}
        />

        {/* Mode & Filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <RetrievalModeSelector
            mode={retrievalMode}
            onChange={setRetrievalMode}
            disabled={searchMutation.isPending || answerMutation.isPending}
          />

          <SearchFilters
            topK={topK}
            onTopKChange={setTopK}
            selectedFileType={selectedFileType}
            onFileTypeChange={setSelectedFileType}
            disabled={searchMutation.isPending || answerMutation.isPending}
          />
        </div>
      </div>

      {/* Answer Generation Loading */}
      {answerMutation.isPending && <AnswerGenerationStatus query={lastSubmittedQuery} />}

      {/* Generated Answer Card */}
      {answerMutation.data && (
        <GeneratedAnswerCard response={answerMutation.data} onAskFollowUp={handleAskAI} />
      )}

      {/* Answer Generation Error */}
      {answerMutation.isError && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">AI Generation Notice</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              {answerMutation.error?.message ||
                'Could not synthesize AI answer from knowledge base.'}
            </p>
          </div>
        </div>
      )}

      {/* Search Error Alert */}
      {searchMutation.isError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div>
            <p className="font-semibold">Retrieval Request Failed</p>
            <p className="mt-0.5 text-rose-700 dark:text-rose-400">
              {searchMutation.error?.message || 'Failed to complete search across knowledge base'}
            </p>
          </div>
        </div>
      )}

      {/* Initial Landing State */}
      {isInitialState && (
        <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Ask questions across company documents
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Search policies, user guides, whitepapers, and operational runbooks. Results are ranked
            using semantic pgvector embeddings and full-text keyword indexing. Click{' '}
            <strong>Ask AI</strong> to generate an evidence-grounded answer with source citations.
          </p>
        </div>
      )}

      {/* Retrieval Loading State */}
      {searchMutation.isPending && !answerMutation.isPending && <SearchLoadingState />}

      {/* Search Results Display */}
      {responseData && (
        <div className="space-y-4">
          {/* Telemetry Bar & Synthesize Action */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {responseData.resultCount} {responseData.resultCount === 1 ? 'passage' : 'passages'}{' '}
                retrieved
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                <Clock className="w-3 h-3 text-slate-400" />
                {responseData.diagnostics.totalDurationMs}ms
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                <Layers className="w-3 h-3 text-indigo-500" />
                {responseData.diagnostics.semanticCandidates} sem +{' '}
                {responseData.diagnostics.keywordCandidates} kw candidates
              </span>
            </div>

            <div className="flex items-center gap-3">
              {!answerMutation.data &&
                !answerMutation.isPending &&
                responseData.resultCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAskAI(lastSubmittedQuery)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Synthesize Grounded Answer</span>
                  </button>
                )}

              {responseData.resultCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsContextModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Preview Prompt Context</span>
                </button>
              )}
            </div>
          </div>

          {/* Results List or Empty Results */}
          {responseData.resultCount === 0 ? (
            <NoSearchResults query={responseData.query} />
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                Source Document Passages
              </div>
              {responseData.results.map(res => (
                <SearchResultCard key={res.chunkId} result={res} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Context Preview Modal */}
      <ContextPreviewModal
        context={responseData?.context || null}
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
      />
    </div>
  );
};
