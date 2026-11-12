export type RetrievalMode = 'hybrid' | 'semantic' | 'keyword';

export interface KnowledgeSearchFilterParams {
  documentIds?: string[];
  fileTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface KnowledgeSearchRequest {
  query: string;
  topK?: number;
  retrievalMode?: RetrievalMode;
  filters?: KnowledgeSearchFilterParams;
  minScore?: number;
  maxChunksPerDoc?: number;
}

export interface KnowledgeSearchCitation {
  documentId: string;
  documentName: string;
  originalFilename: string;
  fileExtension: string;
  chunkId: string;
  chunkIndex: number;
  pageStart: number | null;
  pageEnd: number | null;
  sectionTitle: string | null;
  charStart: number | null;
  charEnd: number | null;
}

export interface KnowledgeSearchResult {
  rank: number;
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  scoreType: 'rrf' | 'cosine_similarity' | 'ts_rank_cd';
  retrievalMethod: 'hybrid' | 'semantic' | 'keyword';
  citation: KnowledgeSearchCitation;
}

export interface KnowledgeContextPassage {
  sourceNumber: number;
  documentName: string;
  originalFilename: string;
  page: number | null;
  section: string | null;
  text: string;
}

export interface KnowledgeContext {
  passages: KnowledgeContextPassage[];
  sourceCount: number;
  totalChars: number;
  trustNotice: string;
}

export interface KnowledgeSearchDiagnostics {
  queryNormalized: string;
  embeddingSpace: string;
  semanticCandidates: number;
  keywordCandidates: number;
  combinedCandidates: number;
  returnedResults: number;
  embeddingDurationMs: number;
  searchDurationMs: number;
  totalDurationMs: number;
  degradedMode?: string | null;
}

export interface KnowledgeSearchResponse {
  organizationId: string;
  query: string;
  retrievalMode: RetrievalMode;
  resultCount: number;
  results: KnowledgeSearchResult[];
  context: KnowledgeContext;
  diagnostics: KnowledgeSearchDiagnostics;
}

// Internal candidate item returned from Python AI service
export interface AiCandidateChunk {
  chunk_id: string;
  document_id: string;
  organization_id: string;
  processing_run_id: string;
  processing_generation: number;
  chunk_index: number;
  content: string;
  char_start: number | null;
  char_end: number | null;
  page_start: number | null;
  page_end: number | null;
  section_title: string | null;
  chunk_metadata: Record<string, unknown>;
  semantic_rank: number | null;
  semantic_score: number | null;
  keyword_rank: number | null;
  keyword_score: number | null;
  score: number;
  score_type: 'rrf' | 'cosine_similarity' | 'ts_rank_cd';
  retrieval_method: 'hybrid' | 'semantic' | 'keyword';
}

export interface AiSearchDiagnostics {
  query_normalized: string;
  embedding_space: string;
  semantic_candidates: number;
  keyword_candidates: number;
  combined_candidates: number;
  returned_results: number;
  embedding_duration_ms: number;
  search_duration_ms: number;
  total_duration_ms: number;
  degraded_mode?: string | null;
}

export interface AiSearchData {
  organization_id: string;
  query: string;
  retrieval_mode: string;
  embedding_space: string;
  result_count: number;
  results: AiCandidateChunk[];
  diagnostics: AiSearchDiagnostics;
}

export interface AiSearchResponse {
  success: boolean;
  data: AiSearchData;
}

// =====================================================================
// Module 10: LLM Integration & Knowledge Answer Types
// =====================================================================

export interface SourceContextItem {
  source_id: string; // S1, S2, etc.
  document_id: string;
  chunk_id: string;
  content: string;
  document_name: string;
  original_filename?: string | null;
  file_extension?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  section_title?: string | null;
  char_start?: number | null;
  char_end?: number | null;
  relevance_score?: number | null;
  processing_generation?: number | null;
}

export interface InternalLLMGenerateRequest {
  request_id?: string;
  organization_id: string;
  query: string;
  prompt_version?: string;
  retrieval_mode?: string;
  sources: SourceContextItem[];
  max_output_tokens?: number;
  temperature?: number;
}

export interface InternalLLMUsage {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
}

export interface InternalLLMMetadata {
  provider: string;
  model: string;
  prompt_version: string;
  retrieval_mode: string | null;
  usage: InternalLLMUsage;
  latency_ms: number | null;
}

export interface InternalLLMGenerateData {
  request_id: string | null;
  answer: string;
  cited_source_ids: string[];
  insufficient_evidence: boolean;
  limitations: string[];
  follow_up_questions: string[];
  metadata: InternalLLMMetadata;
}

export interface InternalLLMGenerateResponse {
  success: boolean;
  data: InternalLLMGenerateData;
}

export interface AnswerCitation {
  sourceId: string;
  documentId: string;
  chunkId: string;
  documentName: string;
  originalFilename: string;
  fileExtension: string;
  pageStart: number | null;
  pageEnd: number | null;
  sectionTitle: string | null;
  charStart: number | null;
  charEnd: number | null;
  relevanceScore: number | null;
}

export interface KnowledgeAnswerRequest {
  query: string;
  topK?: number;
  retrievalMode?: RetrievalMode;
  filters?: KnowledgeSearchFilterParams;
}

export interface KnowledgeAnswerResponse {
  organizationId: string;
  query: string;
  answer: string;
  insufficientEvidence: boolean;
  citations: AnswerCitation[];
  limitations: string[];
  followUpQuestions: string[];
  metadata: {
    provider: string;
    model: string;
    promptVersion: string;
    retrievalMode: RetrievalMode;
    usage: {
      inputTokens: number | null;
      outputTokens: number | null;
      totalTokens: number | null;
    };
    latencyMs: number | null;
  };
}
