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

// =====================================================================
// Module 10: Knowledge Answer Generation Types
// =====================================================================

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
