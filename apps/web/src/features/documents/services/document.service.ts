import { apiClient } from '@/services/api';
import type { ApiResponse } from '@/types';
import type {
  SafeDocument,
  DocumentFilterParams,
  DocumentListResponse,
  DocumentUploadPayload,
  DocumentUpdatePayload,
} from '../types/document.types';

export const documentService = {
  /**
   * Upload a new document with multipart form-data and progress tracking
   */
  async uploadDocument(
    organizationId: string,
    payload: DocumentUploadPayload,
    onProgress?: (percent: number) => void
  ): Promise<SafeDocument> {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.displayName?.trim()) {
      formData.append('displayName', payload.displayName.trim());
    }
    if (payload.description?.trim()) {
      formData.append('description', payload.description.trim());
    }

    const res = await apiClient.post<ApiResponse<{ document: SafeDocument }>>(
      `/organizations/${organizationId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
        onUploadProgress: progressEvent => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to upload document');
    }

    return res.data.data.document;
  },

  /**
   * List documents with filters and pagination
   */
  async listDocuments(
    organizationId: string,
    params: DocumentFilterParams = {}
  ): Promise<DocumentListResponse> {
    const res = await apiClient.get<ApiResponse<DocumentListResponse>>(
      `/organizations/${organizationId}/documents`,
      { params }
    );

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch documents');
    }

    return res.data.data;
  },

  /**
   * Retrieve single document metadata
   */
  async getDocument(organizationId: string, documentId: string): Promise<SafeDocument> {
    const res = await apiClient.get<ApiResponse<{ document: SafeDocument }>>(
      `/organizations/${organizationId}/documents/${documentId}`
    );

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch document details');
    }

    return res.data.data.document;
  },

  /**
   * Download binary document stream securely
   */
  async downloadDocument(
    organizationId: string,
    documentId: string,
    fallbackFilename: string
  ): Promise<void> {
    const res = await apiClient.get(
      `/organizations/${organizationId}/documents/${documentId}/download`,
      {
        responseType: 'blob',
      }
    );

    let filename = fallbackFilename;
    const disposition = res.headers['content-disposition'] as string | undefined;
    if (disposition && typeof disposition === 'string') {
      const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (matchUtf8 && matchUtf8[1]) {
        filename = decodeURIComponent(matchUtf8[1]);
      } else {
        const matchRegular = disposition.match(/filename="?([^";]+)"?/i);
        if (matchRegular && matchRegular[1]) {
          filename = matchRegular[1];
        }
      }
    }

    const contentType =
      (res.headers['content-type'] as string | undefined) || 'application/octet-stream';

    const blob = new Blob([res.data], {
      type: contentType,
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Update document display name or description
   */
  async updateDocument(
    organizationId: string,
    documentId: string,
    payload: DocumentUpdatePayload
  ): Promise<SafeDocument> {
    const res = await apiClient.patch<ApiResponse<{ document: SafeDocument }>>(
      `/organizations/${organizationId}/documents/${documentId}`,
      payload
    );

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to update document');
    }

    return res.data.data.document;
  },

  /**
   * Soft-archive a document
   */
  async archiveDocument(organizationId: string, documentId: string): Promise<SafeDocument> {
    const res = await apiClient.post<ApiResponse<{ document: SafeDocument }>>(
      `/organizations/${organizationId}/documents/${documentId}/archive`
    );

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to archive document');
    }

    return res.data.data.document;
  },

  /**
   * Restore an archived document
   */
  async restoreDocument(organizationId: string, documentId: string): Promise<SafeDocument> {
    const res = await apiClient.post<ApiResponse<{ document: SafeDocument }>>(
      `/organizations/${organizationId}/documents/${documentId}/restore`
    );

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to restore document');
    }

    return res.data.data.document;
  },

  /**
   * Retrieve document processing status
   */
  async getProcessingStatus(
    organizationId: string,
    documentId: string
  ): Promise<import('../types/document.types').DocumentProcessingStatusResponse> {
    const res = await apiClient.get<
      ApiResponse<{
        processing: import('../types/document.types').DocumentProcessingStatusResponse;
      }>
    >(`/organizations/${organizationId}/documents/${documentId}/processing-status`);

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch processing status');
    }

    return res.data.data.processing;
  },

  /**
   * Request manual document reprocessing (owner/admin only)
   */
  async reprocessDocument(
    organizationId: string,
    documentId: string
  ): Promise<import('../types/document.types').DocumentProcessingStatusResponse> {
    const res = await apiClient.post<
      ApiResponse<{
        processing: import('../types/document.types').DocumentProcessingStatusResponse;
      }>
    >(`/organizations/${organizationId}/documents/${documentId}/process`);

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to request document reprocessing');
    }

    return res.data.data.processing;
  },

  /**
   * Retrieve document embedding status
   */
  async getEmbeddingStatus(
    organizationId: string,
    documentId: string
  ): Promise<import('../types/document.types').DocumentEmbeddingStatusResponse> {
    const res = await apiClient.get<
      ApiResponse<{
        embedding: import('../types/document.types').DocumentEmbeddingStatusResponse;
      }>
    >(`/organizations/${organizationId}/documents/${documentId}/embeddings/status`);

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch embedding status');
    }

    return res.data.data.embedding;
  },

  /**
   * Request manual document embedding reprocessing (owner/admin only)
   */
  async reprocessEmbeddings(
    organizationId: string,
    documentId: string
  ): Promise<import('../types/document.types').DocumentEmbeddingStatusResponse> {
    const res = await apiClient.post<
      ApiResponse<{
        embedding: import('../types/document.types').DocumentEmbeddingStatusResponse;
      }>
    >(`/organizations/${organizationId}/documents/${documentId}/embeddings/reprocess`);

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to request embedding generation');
    }

    return res.data.data.embedding;
  },
};
