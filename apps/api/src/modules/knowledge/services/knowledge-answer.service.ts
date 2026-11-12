import { randomUUID } from 'node:crypto';
import { logger } from '../../../utils/logger.js';
import {
  knowledgeRetrievalService,
  KnowledgeRetrievalService,
} from './knowledge-retrieval.service.js';
import { aiLlmClient, AiLlmClient } from '../client/ai-llm.client.js';
import type {
  KnowledgeAnswerRequest,
  KnowledgeAnswerResponse,
  AnswerCitation,
  SourceContextItem,
  InternalLLMGenerateRequest,
} from '../types/knowledge.types.js';

export class KnowledgeAnswerService {
  constructor(
    private retrievalService: KnowledgeRetrievalService = knowledgeRetrievalService,
    private llmClient: AiLlmClient = aiLlmClient
  ) {}

  async generateAnswer(
    organizationId: string,
    params: KnowledgeAnswerRequest
  ): Promise<KnowledgeAnswerResponse> {
    const startTime = performance.now();
    const query = params.query.trim();
    const retrievalMode = params.retrievalMode || 'hybrid';
    const topK = params.topK || 5;

    logger.info(
      `[KnowledgeAnswerService] Generating answer: org=${organizationId}, mode=${retrievalMode}, topK=${topK}, query="${query.slice(0, 60)}..."`
    );

    // Step 1: Execute authorized retrieval with authoritative document validation
    const searchResponse = await this.retrievalService.search(organizationId, {
      query,
      topK,
      retrievalMode,
      filters: params.filters,
    });

    const results = searchResponse.results;

    // Step 2: Handle fast-path for empty retrieval results
    if (!results || results.length === 0) {
      logger.info(
        `[KnowledgeAnswerService] Zero matching documents found for org=${organizationId}. Returning insufficient evidence.`
      );
      const totalLatency = Math.round(performance.now() - startTime);

      return {
        organizationId,
        query,
        answer:
          "I could not find sufficient information in your organization's available documents to answer this question.",
        insufficientEvidence: true,
        citations: [],
        limitations: ['No relevant supporting documents were found in the knowledge base.'],
        followUpQuestions: [],
        metadata: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          promptVersion: 'rag_assistant_v1',
          retrievalMode,
          usage: {
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
          },
          latencyMs: totalLatency,
        },
      };
    }

    // Step 3: Assign stable source identifiers (S1, S2, ...) and assemble context
    const sourceItems: SourceContextItem[] = [];
    const citationMap = new Map<string, AnswerCitation>();

    results.forEach((res, index) => {
      const sourceId = `S${index + 1}`;
      const citation: AnswerCitation = {
        sourceId,
        documentId: res.citation.documentId,
        chunkId: res.citation.chunkId,
        documentName: res.citation.documentName,
        originalFilename: res.citation.originalFilename,
        fileExtension: res.citation.fileExtension,
        pageStart: res.citation.pageStart,
        pageEnd: res.citation.pageEnd,
        sectionTitle: res.citation.sectionTitle,
        charStart: res.citation.charStart,
        charEnd: res.citation.charEnd,
        relevanceScore: res.score,
      };

      citationMap.set(sourceId, citation);

      sourceItems.push({
        source_id: sourceId,
        document_id: res.citation.documentId,
        chunk_id: res.citation.chunkId,
        content: res.content,
        document_name: res.citation.documentName,
        original_filename: res.citation.originalFilename,
        file_extension: res.citation.fileExtension,
        page_start: res.citation.pageStart,
        page_end: res.citation.pageEnd,
        section_title: res.citation.sectionTitle,
        char_start: res.citation.charStart,
        char_end: res.citation.charEnd,
        relevance_score: res.score,
      });
    });

    // Step 4: Dispatch internal request to Python AI service
    const llmRequest: InternalLLMGenerateRequest = {
      request_id: randomUUID(),
      organization_id: organizationId,
      query,
      prompt_version: 'rag_assistant_v1',
      retrieval_mode: retrievalMode,
      sources: sourceItems,
    };

    const llmResponse = await this.llmClient.generate(llmRequest);
    const data = llmResponse.data;

    // Step 5: Authoritative citation mapping and validation
    const validatedCitations: AnswerCitation[] = [];
    const seenCitations = new Set<string>();

    for (const citedId of data.cited_source_ids) {
      if (citationMap.has(citedId) && !seenCitations.has(citedId)) {
        seenCitations.add(citedId);
        validatedCitations.push(citationMap.get(citedId)!);
      } else if (!citationMap.has(citedId)) {
        logger.warn(
          `[KnowledgeAnswerService] Model returned unauthorized citation ID: "${citedId}". Stripped.`
        );
      }
    }

    const totalLatency = Math.round(performance.now() - startTime);

    return {
      organizationId,
      query,
      answer: data.answer,
      insufficientEvidence: data.insufficient_evidence,
      citations: validatedCitations,
      limitations: data.limitations,
      followUpQuestions: data.follow_up_questions,
      metadata: {
        provider: data.metadata.provider,
        model: data.metadata.model,
        promptVersion: data.metadata.prompt_version,
        retrievalMode,
        usage: {
          inputTokens: data.metadata.usage.input_tokens,
          outputTokens: data.metadata.usage.output_tokens,
          totalTokens: data.metadata.usage.total_tokens,
        },
        latencyMs: totalLatency,
      },
    };
  }
}

export const knowledgeAnswerService = new KnowledgeAnswerService();
