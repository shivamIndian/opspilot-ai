import type { Pool } from 'pg';
import { pool } from '../../../database/index.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import { aiRetrievalClient, AiRetrievalClient } from '../client/ai-retrieval.client.js';
import { contextAssemblerService, ContextAssemblerService } from './context-assembler.service.js';
import {
  DEFAULT_EMBEDDING_PROVIDER,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_DIMENSIONS,
} from '../../documents/embeddings/embedding.constants.js';
import type {
  KnowledgeSearchRequest,
  KnowledgeSearchResponse,
  KnowledgeSearchResult,
  KnowledgeSearchCitation,
} from '../types/knowledge.types.js';

interface DocumentValidationRow {
  id: string;
  organization_id: string;
  display_name: string;
  original_filename: string;
  file_extension: string;
  status: string;
  archived_at: Date | null;
  processing_status: string;
  processing_generation: number;
  embedding_status: string;
}

export class KnowledgeRetrievalService {
  private db: Pool;
  private aiClient: AiRetrievalClient;
  private assembler: ContextAssemblerService;

  constructor(
    dbPool: Pool = pool,
    client: AiRetrievalClient = aiRetrievalClient,
    contextAssembler: ContextAssemblerService = contextAssemblerService
  ) {
    this.db = dbPool;
    this.aiClient = client;
    this.assembler = contextAssembler;
  }

  /**
   * Primary entry point for enterprise knowledge retrieval.
   * Enforces tenant isolation, queries internal AI search service, executes authoritative
   * document validation against app.documents, enriches citations, and packages RAG context.
   */
  async search(
    organizationId: string,
    request: KnowledgeSearchRequest
  ): Promise<KnowledgeSearchResponse> {
    const provider = config.EMBEDDING_PROVIDER || DEFAULT_EMBEDDING_PROVIDER;
    const model = config.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
    const dimensions = config.EMBEDDING_DIMENSIONS || DEFAULT_EMBEDDING_DIMENSIONS;
    const embeddingSpace = `${provider}:${model}:${dimensions}`;

    const topK = request.topK ?? 5;
    const retrievalMode = request.retrievalMode ?? 'hybrid';

    logger.info(
      `[KnowledgeSearch] Querying org=${organizationId}, mode=${retrievalMode}, topK=${topK}, space=${embeddingSpace}`
    );

    // 1. Call internal AI retrieval service
    const aiResponse = await this.aiClient.search({
      organizationId,
      query: request.query,
      topK,
      retrievalMode,
      embeddingSpace,
      filters: request.filters,
      minScore: request.minScore,
      maxChunksPerDoc: request.maxChunksPerDoc,
    });

    const candidates = aiResponse.data.results || [];
    if (candidates.length === 0) {
      const emptyContext = this.assembler.assembleContext([]);
      return {
        organizationId,
        query: request.query,
        retrievalMode,
        resultCount: 0,
        results: [],
        context: emptyContext,
        diagnostics: {
          queryNormalized: aiResponse.data.diagnostics.query_normalized,
          embeddingSpace: aiResponse.data.diagnostics.embedding_space,
          semanticCandidates: aiResponse.data.diagnostics.semantic_candidates,
          keywordCandidates: aiResponse.data.diagnostics.keyword_candidates,
          combinedCandidates: aiResponse.data.diagnostics.combined_candidates,
          returnedResults: 0,
          embeddingDurationMs: aiResponse.data.diagnostics.embedding_duration_ms,
          searchDurationMs: aiResponse.data.diagnostics.search_duration_ms,
          totalDurationMs: aiResponse.data.diagnostics.total_duration_ms,
          degradedMode: aiResponse.data.diagnostics.degraded_mode,
        },
      };
    }

    // 2. Authoritative Document State Validation against app.documents
    // Extract unique document IDs from the candidate pool
    const candidateDocIds = Array.from(new Set(candidates.map(c => c.document_id)));

    const docQuery = `
      SELECT 
        id,
        organization_id,
        display_name,
        original_filename,
        file_extension,
        status,
        archived_at,
        processing_status,
        processing_generation,
        embedding_status
      FROM app.documents
      WHERE organization_id = $1 AND id = ANY($2);
    `;

    const docResult = await this.db.query(docQuery, [organizationId, candidateDocIds]);
    const docMap = new Map<string, DocumentValidationRow>();

    for (const row of docResult.rows) {
      docMap.set(row.id, row);
    }

    // 3. Filter candidates based on authoritative eligibility & generation matching
    const validatedResults: KnowledgeSearchResult[] = [];
    let rankCounter = 1;

    for (const candidate of candidates) {
      const doc = docMap.get(candidate.document_id);

      // Validation Checks:
      // a. Document must exist in the caller's organization
      if (!doc || doc.organization_id !== organizationId) {
        logger.warn(
          `[KnowledgeSearch] Rejecting candidate chunk=${candidate.chunk_id}: document=${candidate.document_id} not found in org=${organizationId}`
        );
        continue;
      }

      // b. Document must be active (not archived)
      if (doc.status !== 'active' || doc.archived_at !== null) {
        logger.info(
          `[KnowledgeSearch] Discarding candidate chunk=${candidate.chunk_id}: document=${doc.id} is archived`
        );
        continue;
      }

      // c. Document processing and embedding must be fully completed
      if (doc.processing_status !== 'completed' || doc.embedding_status !== 'completed') {
        logger.warn(
          `[KnowledgeSearch] Discarding candidate chunk=${candidate.chunk_id}: doc=${doc.id} status proc=${doc.processing_status}, emb=${doc.embedding_status}`
        );
        continue;
      }

      // d. Generation must match current document generation
      if (doc.processing_generation !== candidate.processing_generation) {
        logger.info(
          `[KnowledgeSearch] Discarding stale chunk=${candidate.chunk_id}: candidate_gen=${candidate.processing_generation} != doc_gen=${doc.processing_generation}`
        );
        continue;
      }

      // 4. Enrich verified candidate with authoritative metadata
      const citation: KnowledgeSearchCitation = {
        documentId: doc.id,
        documentName: doc.display_name,
        originalFilename: doc.original_filename,
        fileExtension: doc.file_extension,
        chunkId: candidate.chunk_id,
        chunkIndex: candidate.chunk_index,
        pageStart: candidate.page_start ?? null,
        pageEnd: candidate.page_end ?? null,
        sectionTitle: candidate.section_title ?? null,
        charStart: candidate.char_start ?? null,
        charEnd: candidate.char_end ?? null,
      };

      validatedResults.push({
        rank: rankCounter++,
        chunkId: candidate.chunk_id,
        documentId: candidate.document_id,
        content: candidate.content,
        score: candidate.score,
        scoreType: candidate.score_type,
        retrievalMethod: candidate.retrieval_method,
        citation,
      });

      if (validatedResults.length >= topK) {
        break;
      }
    }

    // 5. Assemble structured context package
    const assembledContext = this.assembler.assembleContext(validatedResults);

    return {
      organizationId,
      query: request.query,
      retrievalMode,
      resultCount: validatedResults.length,
      results: validatedResults,
      context: assembledContext,
      diagnostics: {
        queryNormalized: aiResponse.data.diagnostics.query_normalized,
        embeddingSpace: aiResponse.data.diagnostics.embedding_space,
        semanticCandidates: aiResponse.data.diagnostics.semantic_candidates,
        keywordCandidates: aiResponse.data.diagnostics.keyword_candidates,
        combinedCandidates: aiResponse.data.diagnostics.combined_candidates,
        returnedResults: validatedResults.length,
        embeddingDurationMs: aiResponse.data.diagnostics.embedding_duration_ms,
        searchDurationMs: aiResponse.data.diagnostics.search_duration_ms,
        totalDurationMs: aiResponse.data.diagnostics.total_duration_ms,
        degradedMode: aiResponse.data.diagnostics.degraded_mode,
      },
    };
  }
}

export const knowledgeRetrievalService = new KnowledgeRetrievalService();
