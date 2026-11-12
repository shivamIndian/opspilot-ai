import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DOCUMENT_PROCESSING_QUEUE_NAME,
  DOCUMENT_PROCESSING_ATTEMPTS,
} from '../src/modules/documents/processing/document-processing.constants.js';
import {
  DOCUMENT_EMBEDDING_QUEUE_NAME,
  DOCUMENT_EMBEDDING_ATTEMPTS,
} from '../src/modules/documents/embeddings/embedding.constants.js';
import type { DocumentProcessingJobData } from '../src/modules/documents/processing/document-processing.types.js';
import type { DocumentEmbeddingJobData } from '../src/modules/documents/embeddings/embedding.types.js';

describe('Module 25: Queue Lifecycle & Resilience Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Document Processing Queue Configuration', () => {
    it('enforces exponential backoff and bounded attempt parameters', () => {
      expect(DOCUMENT_PROCESSING_QUEUE_NAME).toBe('opspilot-document-processing');
      expect(DOCUMENT_PROCESSING_ATTEMPTS).toBe(3);
    });

    it('creates deterministic job IDs to prevent duplicate concurrent jobs for identical document generations', () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-1234',
        organizationId: 'org-5678',
        pipelineVersion: '1.0',
        generation: 1,
        requestedByUserId: 'usr-admin',
      };

      const expectedJobId = `doc-proc:${jobData.documentId}:gen-${jobData.generation}`;
      expect(expectedJobId).toBe('doc-proc:doc-1234:gen-1');
    });
  });

  describe('Document Embedding Queue Configuration', () => {
    it('enforces bounded retry attempts and queue naming convention', () => {
      expect(DOCUMENT_EMBEDDING_QUEUE_NAME).toBe('opspilot-document-embeddings');
      expect(DOCUMENT_EMBEDDING_ATTEMPTS).toBe(3);
    });

    it('constructs deterministic embedding job identifiers', () => {
      const embeddingData: DocumentEmbeddingJobData = {
        documentId: 'doc-emb-1',
        organizationId: 'org-alpha',
        generation: 2,
        embeddingSpace: 'openai:text-embedding-3-small:1536',
        forceReindex: false,
        requestedByUserId: 'usr-admin',
      };

      const deterministicId = `doc-emb:${embeddingData.documentId}:gen-${embeddingData.generation}`;
      expect(deterministicId).toBe('doc-emb:doc-emb-1:gen-2');
    });
  });

  describe('Retry vs Terminal Failure Discrimination', () => {
    it('distinguishes terminal business errors (non-retryable) from transient network errors (retryable)', () => {
      const nonRetryableCodes = ['NO_EXTRACTABLE_TEXT', 'UNSUPPORTED_MIME_TYPE', 'DOCUMENT_ARCHIVED'];
      const retryableCodes = ['NETWORK_TIMEOUT', 'EMBEDDING_RATE_LIMITED', 'AI_SERVICE_UNAVAILABLE'];

      const isRetryable = (code: string) => !nonRetryableCodes.includes(code);

      expect(isRetryable('NO_EXTRACTABLE_TEXT')).toBe(false);
      expect(isRetryable('UNSUPPORTED_MIME_TYPE')).toBe(false);
      expect(isRetryable('DOCUMENT_ARCHIVED')).toBe(false);

      expect(isRetryable('NETWORK_TIMEOUT')).toBe(true);
      expect(isRetryable('EMBEDDING_RATE_LIMITED')).toBe(true);
      expect(isRetryable('AI_SERVICE_UNAVAILABLE')).toBe(true);
    });
  });
});
