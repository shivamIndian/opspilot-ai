import type { DocumentEmbeddingStatus } from '../types/document.types.js';

export interface DocumentEmbeddingJobData {
  organizationId: string;
  documentId: string;
  processingGeneration: number;
  embeddingGeneration: number;
  pipelineVersion?: string;
  provider?: string;
  model?: string;
  dimensions?: number;
}

export interface DocumentEmbeddingJobResult {
  success: boolean;
  organizationId: string;
  documentId: string;
  embeddingGeneration: number;
  provider: string;
  model: string;
  dimensions: number;
  embeddingSpace: string;
  totalChunks: number;
  embeddedChunks: number;
  failedChunks: number;
  status: string;
  durationMs: number;
  errorCode?: string;
}

export interface UpdateEmbeddingStatusParams {
  status: DocumentEmbeddingStatus;
  provider?: string;
  model?: string;
  dimensions?: number;
  embeddedChunkCount?: number;
  errorCode?: string | null;
  startedAt?: Date | null;
  embeddedAt?: Date | null;
}

export interface DocumentEmbeddingStatusResponse {
  documentId: string;
  status: DocumentEmbeddingStatus;
  generation: number;
  provider: string | null;
  model: string | null;
  dimensions: number | null;
  embeddedChunkCount: number;
  errorCode: string | null;
  startedAt: string | null;
  embeddedAt: string | null;
  updatedAt: string | null;
}
