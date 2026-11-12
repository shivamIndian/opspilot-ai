import type { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import type { DocumentProcessingJobResult } from './document-processing.types.js';

export class AiProcessingClientError extends Error {
  constructor(
    message: string,
    public errorCode: string,
    public isRetryable: boolean = false,
    public status?: number
  ) {
    super(message);
    this.name = 'AiProcessingClientError';
  }
}

export interface SendToAiServiceParams {
  organizationId: string;
  documentId: string;
  processingGeneration: number;
  pipelineVersion: string;
  sourceChecksum: string;
  fileExtension: string;
  mimeType: string;
  filename: string;
  fileStream: Readable;
}

export class DocumentProcessingClient {
  private baseUrl: string;
  private internalToken: string;

  constructor(
    aiServiceUrl: string = config.AI_SERVICE_URL,
    internalToken: string = config.AI_SERVICE_INTERNAL_TOKEN
  ) {
    this.baseUrl = aiServiceUrl.replace(/\/+$/, '');
    this.internalToken = internalToken;
  }

  async sendToAiService(params: SendToAiServiceParams): Promise<DocumentProcessingJobResult> {
    const targetUrl = `${this.baseUrl}/internal/v1/documents/process`;

    try {
      // Consume file stream into binary buffer for multipart transmission
      const fileBuffer = await buffer(params.fileStream);
      const fileBlob = new Blob([fileBuffer], {
        type: params.mimeType || 'application/octet-stream',
      });

      const formData = new FormData();
      formData.append('file', fileBlob, params.filename);
      formData.append('organization_id', params.organizationId);
      formData.append('document_id', params.documentId);
      formData.append('processing_generation', params.processingGeneration.toString());
      formData.append('source_checksum', params.sourceChecksum);
      formData.append('pipeline_version', params.pipelineVersion);
      formData.append('file_extension', params.fileExtension);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.internalToken}`,
        },
        body: formData,
        signal: AbortSignal.timeout(60000), // 60s timeout for document processing
      });

      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: await response.text().catch(() => 'Unknown AI service response') };
        }

        const detail = errorData?.detail || errorData;
        const errorCode = detail?.error_code || `HTTP_${response.status}`;
        const errorMessage = detail?.message || `AI service returned error HTTP ${response.status}`;
        const isRetryable =
          response.status >= 500 ||
          errorCode === 'AI_SERVICE_UNAVAILABLE' ||
          errorCode === 'INTERNAL_PROCESSING_ERROR';

        throw new AiProcessingClientError(errorMessage, errorCode, isRetryable, response.status);
      }

      const result: any = await response.json();
      return {
        success: true,
        pageCount: result.page_count ?? null,
        extractedCharCount: result.extracted_char_count ?? 0,
        chunkCount: result.chunk_count ?? 0,
        pipelineVersion: result.pipeline_version,
        errorCode: null,
      };
    } catch (err: unknown) {
      if (err instanceof AiProcessingClientError) {
        throw err;
      }

      // Handle network errors, connection refused, or timeouts
      const errorMsg = (err as Error).message || 'Failed to connect to AI processing microservice';
      logger.warn(`AI service request failed for doc=${params.documentId}: ${errorMsg}`);

      const isTimeout =
        (err as Error).name === 'TimeoutError' || (err as Error).name === 'AbortError';

      throw new AiProcessingClientError(
        isTimeout ? 'Document processing request timed out' : errorMsg,
        isTimeout ? 'PROCESSING_TIMEOUT' : 'AI_SERVICE_UNAVAILABLE',
        true // Network failures are retryable
      );
    }
  }
}

export const documentProcessingClient = new DocumentProcessingClient();
