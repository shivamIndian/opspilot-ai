import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import type {
  AiSearchResponse,
  RetrievalMode,
  KnowledgeSearchFilterParams,
} from '../types/knowledge.types.js';

export class AiRetrievalClientError extends Error {
  constructor(
    message: string,
    public errorCode: string,
    public isRetryable: boolean = false,
    public status?: number
  ) {
    super(message);
    this.name = 'AiRetrievalClientError';
  }
}

export interface InternalSearchCallParams {
  organizationId: string;
  query: string;
  topK: number;
  retrievalMode: RetrievalMode;
  embeddingSpace: string;
  filters?: KnowledgeSearchFilterParams;
  minScore?: number;
  maxChunksPerDoc?: number;
}

export class AiRetrievalClient {
  private baseUrl: string;
  private internalToken: string;

  constructor(
    aiServiceUrl: string = config.AI_SERVICE_URL,
    internalToken: string = config.AI_SERVICE_INTERNAL_TOKEN
  ) {
    this.baseUrl = aiServiceUrl.replace(/\/+$/, '');
    this.internalToken = internalToken;
  }

  async search(params: InternalSearchCallParams): Promise<AiSearchResponse> {
    const targetUrl = `${this.baseUrl}/internal/v1/retrieval/search`;

    const payload = {
      organization_id: params.organizationId,
      query: params.query,
      top_k: params.topK,
      retrieval_mode: params.retrievalMode,
      embedding_space: params.embeddingSpace,
      filters: params.filters
        ? {
            document_ids: params.filters.documentIds,
            file_types: params.filters.fileTypes,
            date_from: params.filters.dateFrom,
            date_to: params.filters.dateTo,
          }
        : undefined,
      min_score: params.minScore,
      max_chunks_per_doc: params.maxChunksPerDoc,
    };

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.internalToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // Response body was not JSON
        }

        const detail = errorData.detail || errorData;
        const errorCode = detail.error_code || 'RETRIEVAL_INTERNAL_ERROR';
        const message =
          detail.message || `AI service retrieval failed with status ${response.status}`;
        const isRetryable = response.status >= 500;

        logger.warn(
          `AI service retrieval error (HTTP ${response.status}): code=${errorCode}, msg=${message}`
        );

        throw new AiRetrievalClientError(message, errorCode, isRetryable, response.status);
      }

      const data = (await response.json()) as AiSearchResponse;
      return data;
    } catch (err: unknown) {
      if (err instanceof AiRetrievalClientError) {
        throw err;
      }

      logger.error('Failed to communicate with AI microservice retrieval endpoint:', err);
      throw new AiRetrievalClientError(
        (err as Error).message || 'Network connection failed to AI retrieval service',
        'RETRIEVAL_SERVICE_UNAVAILABLE',
        true
      );
    }
  }
}

export const aiRetrievalClient = new AiRetrievalClient();
