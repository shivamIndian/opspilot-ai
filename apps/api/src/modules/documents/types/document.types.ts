export type DocumentStatus = 'active' | 'archived';

export type DocumentProcessingStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed';

export type DocumentEmbeddingStatus =
  'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'skipped';

export type DocumentExtension = 'pdf' | 'docx' | 'txt' | 'md';

export type DocumentStorageProvider = 'local' | 's3';

export type DocumentAction =
  | 'document.uploaded'
  | 'document.metadata_updated'
  | 'document.downloaded'
  | 'document.archived'
  | 'document.restored'
  | 'document.upload_failed';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface DocumentEntity {
  id: string;
  organization_id: string;
  uploaded_by_user_id: string;
  original_filename: string;
  display_name: string;
  description: string | null;
  file_extension: DocumentExtension;
  mime_type: string;
  size_bytes: string | number;
  sha256_checksum: string;
  storage_provider: DocumentStorageProvider;
  storage_key: string;
  status: DocumentStatus;
  metadata: Record<string, unknown>;
  processing_status?: DocumentProcessingStatus;
  processing_generation?: number;
  processing_pipeline_version?: string | null;
  processing_attempts?: number;
  page_count?: number | null;
  extracted_char_count?: number | string | null;
  chunk_count?: number;
  processing_error_code?: string | null;
  processed_at?: Date | null;
  processing_started_at?: Date | null;
  processing_updated_at?: Date | null;
  embedding_status?: DocumentEmbeddingStatus;
  embedding_generation?: number;
  embedding_provider?: string | null;
  embedding_model?: string | null;
  embedding_dimensions?: number | null;
  embedded_chunk_count?: number;
  embedding_error_code?: string | null;
  embedding_started_at?: Date | null;
  embedded_at?: Date | null;
  embedding_updated_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

export interface DocumentWithUploaderEntity extends DocumentEntity {
  uploader_name?: string;
  uploader_email?: string;
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
  embeddingStatus: DocumentEmbeddingStatus;
  embeddingGeneration: number;
  embeddingProvider: string | null;
  embeddingModel: string | null;
  embeddingDimensions: number | null;
  embeddedChunkCount: number;
  embeddingErrorCode: string | null;
  embeddedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  uploader?: UserSummary;
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
