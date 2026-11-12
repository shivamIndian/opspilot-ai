import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import type {
  InternalLLMGenerateRequest,
  InternalLLMGenerateResponse,
} from '../types/knowledge.types.js';

export class AiLlmClientError extends Error {
  constructor(
    message: string,
    public errorCode: string,
    public isRetryable: boolean = false,
    public status?: number
  ) {
    super(message);
    this.name = 'AiLlmClientError';
  }
}

export class AiLlmClient {
  private baseUrl: string;
  private internalToken: string;

  constructor(
    aiServiceUrl: string = config.AI_SERVICE_URL,
    internalToken: string = config.AI_SERVICE_INTERNAL_TOKEN
  ) {
    this.baseUrl = aiServiceUrl.replace(/\/+$/, '');
    this.internalToken = internalToken;
  }

  async generate(params: InternalLLMGenerateRequest): Promise<InternalLLMGenerateResponse> {
    const targetUrl = `${this.baseUrl}/internal/v1/llm/generate`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.internalToken}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        let errData: {
          detail?: { error_code?: string; message?: string; is_retryable?: boolean };
        } = {};
        try {
          errData = await response.json();
        } catch {
          // Non-JSON error body
        }

        const errorCode = errData.detail?.error_code || 'AI_LLM_ERROR';
        const errorMessage =
          errData.detail?.message || `AI service returned HTTP ${response.status}`;
        const isRetryable =
          errData.detail?.is_retryable ?? (response.status >= 500 || response.status === 429);

        logger.error(
          `[AiLlmClient] Generation request failed: status=${response.status}, code=${errorCode}, msg=${errorMessage}`
        );

        throw new AiLlmClientError(errorMessage, errorCode, isRetryable, response.status);
      }

      const data: InternalLLMGenerateResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof AiLlmClientError) {
        throw error;
      }

      logger.error('[AiLlmClient] Network or unexpected failure during LLM generation:', error);
      throw new AiLlmClientError(
        (error as Error).message || 'Failed to reach AI microservice for LLM generation',
        'AI_SERVICE_UNAVAILABLE',
        true
      );
    }
  }
}

export const aiLlmClient = new AiLlmClient();
