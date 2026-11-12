import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import type { DocumentEmbeddingJobResult } from './embedding.types.js';

export class AiEmbeddingClientError extends Error {
  constructor(
    message: string,
    public errorCode: string,
    public isRetryable: boolean = false,
    public status?: number
  ) {
    super(message);
    this.name = 'AiEmbeddingClientError';
  }
}

export interface SendToAiEmbeddingParams {
  organizationId: string;
  documentId: string;
  processingGeneration: number;
  embeddingGeneration: number;
  provider: string;
  model: string;
  dimensions: number;
  embeddingSpace?: string;
}

export class DocumentEmbeddingClient {
  private baseUrl: string;
  private internalToken: string;

  constructor(
    aiServiceUrl: string = config.AI_SERVICE_URL,
    internalToken: string = config.AI_SERVICE_INTERNAL_TOKEN
  ) {
    this.baseUrl = aiServiceUrl.replace(/\/+$/, '');
    this.internalToken = internalToken;
  }

  async generateEmbeddings(params: SendToAiEmbeddingParams): Promise<DocumentEmbeddingJobResult> {
    const targetUrl = `${this.baseUrl}/internal/v1/embeddings/generate`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.internalToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          organization_id: params.organizationId,
          document_id: params.documentId,
          processing_generation: params.processingGeneration,
          embedding_generation: params.embeddingGeneration,
          provider: params.provider,
          model: params.model,
          dimensions: params.dimensions,
          embedding_space: params.embeddingSpace,
        }),
      });

      if (!response.ok) {
        let errData: any = {};
        try {
          errData = await response.json();
        } catch {
          // Non-JSON response
        }

        const detail = errData.detail || {};
        const errorCode = detail.error_code || errData.error_code || 'EMBEDDING_GENERATION_FAILED';
        const message = detail.message || errData.message || response.statusText;
        const isRetryable =
          detail.is_retryable !== undefined ? detail.is_retryable : response.status >= 500;

        throw new AiEmbeddingClientError(message, errorCode, isRetryable, response.status);
      }

      const resJson = await response.json();
      const data = resJson.data || {};

      return {
        success: true,
        organizationId: data.organization_id || params.organizationId,
        documentId: data.document_id || params.documentId,
        embeddingGeneration: data.embedding_generation || params.embeddingGeneration,
        provider: data.provider || params.provider,
        model: data.model || params.model,
        dimensions: data.dimensions || params.dimensions,
        embeddingSpace: data.embedding_space || '',
        totalChunks: data.total_chunks || 0,
        embeddedChunks: data.embedded_chunks || 0,
        failedChunks: data.failed_chunks || 0,
        status: data.status || 'completed',
        durationMs: data.duration_ms || 0,
      };
    } catch (err: unknown) {
      if (err instanceof AiEmbeddingClientError) {
        throw err;
      }

      logger.error('Failed to communicate with AI microservice embedding endpoint:', err);
      throw new AiEmbeddingClientError(
        (err as Error).message || 'Network connection failed to AI service',
        'EMBEDDING_PROVIDER_UNAVAILABLE',
        true
      );
    }
  }
}

export const documentEmbeddingClient = new DocumentEmbeddingClient();
