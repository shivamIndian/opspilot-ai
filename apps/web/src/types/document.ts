export type DocumentStatus = 'active' | 'archived';

export type DocumentProcessingStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed';

export type DocumentEmbeddingStatus =
  'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'skipped';

export type DocumentExtension = 'pdf' | 'docx' | 'txt' | 'md';

export interface DocumentUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface SafeDocument {
  id: string;
  organizationId: string;
  uploadedByUserId: string;
  originalFilename: string;
  displayName: string;
  description: string | null;
  fileExtension: DocumentExtension;
  mimeType: string;
  sizeBytes: number;
  sha256Checksum: string;
  status: DocumentStatus;
  processingStatus: DocumentProcessingStatus;
  processingGeneration: number;
  processingPipelineVersion: string | null;
  pageCount: number | null;
  extractedCharCount: number | null;
  chunkCount: number;
  processingErrorCode: string | null;
  processedAt: string | null;
  embeddingStatus?: DocumentEmbeddingStatus;
  embeddingGeneration?: number;
  embeddingProvider?: string | null;
  embeddingModel?: string | null;
  embeddingDimensions?: number | null;
  embeddedChunkCount?: number;
  embeddingErrorCode?: string | null;
  embeddedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  uploader?: DocumentUserSummary;
}

export interface DocumentFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: DocumentStatus;
  fileType?: DocumentExtension;
  uploadedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'created_at' | 'updated_at' | 'display_name' | 'size_bytes';
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DocumentListResponse {
  documents: SafeDocument[];
  pagination: DocumentPagination;
}

export interface DocumentUploadPayload {
  file: File;
  displayName?: string;
  description?: string;
}

export interface DocumentUpdatePayload {
  displayName?: string;
  description?: string | null;
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
