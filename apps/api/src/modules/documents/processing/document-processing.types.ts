import type { ProcessingErrorCode } from './document-processing.constants.js';
import type { DocumentProcessingStatus } from '../types/document.types.js';

export type { DocumentProcessingStatus };

export interface DocumentProcessingJobData {
  organizationId: string;
  documentId: string;
  processingGeneration: number;
  pipelineVersion: string;
}

export interface DocumentProcessingJobResult {
  success: boolean;
  pageCount?: number | null;
  extractedCharCount?: number;
  chunkCount?: number;
  pipelineVersion?: string;
  errorCode?: ProcessingErrorCode | string | null;
}

export interface DocumentProcessingStatusResponse {
  status: DocumentProcessingStatus;
  generation: number;
  pipelineVersion: string | null;
  pageCount: number | null;
  extractedCharCount: number | null;
  chunkCount: number;
  processedAt: string | null;
  processingStartedAt: string | null;
  errorCode: string | null;
}

export interface UpdateProcessingStatusParams {
  status: DocumentProcessingStatus;
  attempts?: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  pageCount?: number | null;
  extractedCharCount?: number | null;
  chunkCount?: number;
  errorCode?: string | null;
  pipelineVersion?: string | null;
}
