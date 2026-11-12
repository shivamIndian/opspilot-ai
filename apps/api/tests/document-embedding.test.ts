import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/index.js';
import { documentRepository } from '../src/modules/documents/repositories/document.repository.js';
import { documentEmbeddingRepository } from '../src/modules/documents/embeddings/embedding.repository.js';
import {
  documentEmbeddingClient,
  AiEmbeddingClientError,
} from '../src/modules/documents/embeddings/embedding.client.js';
import * as embeddingQueueModule from '../src/queues/document-embedding.queue.js';
import { handleDocumentEmbeddingJob } from '../src/workers/document-embedding.handlers.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { organizationAuditRepository } from '../src/modules/organizations/repositories/organization-audit.repository.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import type { DocumentWithUploaderEntity } from '../src/modules/documents/types/document.types.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';
import type { Job } from 'bullmq';
import type { DocumentEmbeddingJobData } from '../src/modules/documents/embeddings/embedding.types.js';

describe('OpsPilot API – Embeddings Generation & Vector Database Module 08', () => {
  // Test Users
  const userOwner: UserEntity = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Owner User',
    email: 'owner@example.com',
    password_hash: 'hash',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const userMember: UserEntity = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Member User',
    email: 'member@example.com',
    password_hash: 'hash',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const userForeign: UserEntity = {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Foreign User',
    email: 'foreign@example.com',
    password_hash: 'hash',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const orgA: OrganizationEntity = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Test Org A',
    slug: 'test-org-a',
    description: 'Org A for testing',
    logo_url: null,
    status: 'active',
    created_by: userOwner.id,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberOwnerInA: OrganizationMemberEntity = {
    id: '55555555-5555-4555-8555-555555555551',
    organization_id: orgA.id,
    user_id: userOwner.id,
    role: 'owner',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberRegularInA: OrganizationMemberEntity = {
    id: '55555555-5555-4555-8555-555555555552',
    organization_id: orgA.id,
    user_id: userMember.id,
    role: 'member',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockActiveDoc: DocumentWithUploaderEntity = {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    organization_id: orgA.id,
    uploaded_by_user_id: userOwner.id,
    display_name: 'Knowledge Guide',
    original_filename: 'guide.pdf',
    storage_key: 'orgs/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/docs/guide.pdf',
    file_extension: 'pdf',
    mime_type: 'application/pdf',
    size_bytes: 1048576,
    sha256_checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'active',
    archived_at: null,
    archived_by_user_id: null,
    processing_status: 'completed',
    processing_error_code: null,
    processing_error_message: null,
    processing_generation: 1,
    processing_attempts: 1,
    chunk_count: 5,
    page_count: 3,
    extracted_char_count: 5000,
    pipeline_version: 'document-pipeline-v1',
    processed_at: new Date(),
    embedding_status: 'completed',
    embedding_error_code: null,
    embedding_error_message: null,
    embedding_generation: 1,
    embedded_chunk_count: 5,
    embedded_at: new Date(),
    embedding_model: 'text-embedding-3-small',
    embedding_dimensions: 1536,
    created_at: new Date(),
    updated_at: new Date(),
    uploader_name: userOwner.name,
    uploader_email: userOwner.email,
  };

  const getJwt = (user: UserEntity) =>
    tokenService.generateAccessToken(user.id, user.platform_role).token;

  let tokenOwner: string;
  let tokenMember: string;
  let tokenForeign: string;

  beforeEach(() => {
    vi.restoreAllMocks();

    tokenOwner = getJwt(userOwner);
    tokenMember = getJwt(userMember);
    tokenForeign = getJwt(userForeign);

    // Mock Pool & Organization Repositories
    vi.spyOn(pool, 'query').mockImplementation(async (text: any, params?: any[]) => {
      const q = typeof text === 'string' ? text : text.text;
      if (q.includes('FROM app.users WHERE id = $1')) {
        const id = params?.[0];
        if (id === userOwner.id) return { rows: [userOwner], rowCount: 1 } as any;
        if (id === userMember.id) return { rows: [userMember], rowCount: 1 } as any;
        if (id === userForeign.id) return { rows: [userForeign], rowCount: 1 } as any;
        return { rows: [], rowCount: 0 } as any;
      }
      return { rows: [], rowCount: 0 } as any;
    });

    vi.spyOn(organizationRepository, 'findById').mockImplementation(async id => {
      if (id === orgA.id) return orgA;
      return null;
    });

    vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(async (orgId, userId) => {
      if (orgId === orgA.id && userId === userOwner.id) return memberOwnerInA;
      if (orgId === orgA.id && userId === userMember.id) return memberRegularInA;
      return null;
    });

    vi.spyOn(organizationAuditRepository, 'logEvent').mockResolvedValue({} as any);
  });

  describe('GET /api/v1/organizations/:orgId/documents/:docId/embeddings/status', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get(
        `/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/embeddings/status`
      );
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not a member of the organization', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/embeddings/status`)
        .set('Authorization', `Bearer ${tokenForeign}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('returns 404 when document does not exist', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue(null);
      vi.spyOn(documentEmbeddingRepository, 'getStatus').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/embeddings/status`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('returns 200 with embedding status telemetry for regular member', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue(mockActiveDoc);
      vi.spyOn(documentEmbeddingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'completed',
        generation: 1,
        provider: 'mock',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        embeddedChunkCount: 5,
        errorCode: null,
        startedAt: null,
        embeddedAt: mockActiveDoc.embedded_at ? mockActiveDoc.embedded_at.toISOString() : null,
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/embeddings/status`)
        .set('Authorization', `Bearer ${tokenMember}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.embedding.status).toBe('completed');
      expect(res.body.data.embedding.embeddedChunkCount).toBe(5);
      expect(res.body.data.embedding.model).toBe('text-embedding-3-small');
      expect(res.body.data.embedding.dimensions).toBe(1536);
    });
  });

  describe('POST /api/v1/organizations/:orgId/documents/:docId/embeddings/reprocess', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).post(
        `/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/embeddings/reprocess`
      );
      expect(res.status).toBe(401);
    });

    it('returns 403 when regular member tries to trigger reprocessing', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/embeddings/reprocess`)
        .set('Authorization', `Bearer ${tokenMember}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 400 when document is archived', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue({
        ...mockActiveDoc,
        status: 'archived',
        archived_at: new Date(),
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/embeddings/reprocess`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DOCUMENT_ARCHIVED');
    });

    it('returns 400 when document extraction processing is not completed', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue({
        ...mockActiveDoc,
        processing_status: 'processing',
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/embeddings/reprocess`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_EXTRACTED');
    });

    it('returns 202 and enqueues BullMQ job on valid request by owner', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue(mockActiveDoc);

      vi.spyOn(documentEmbeddingRepository, 'incrementGenerationAndSetQueued').mockResolvedValue({
        generation: 2,
        status: 'queued',
      });

      const schedSpy = vi
        .spyOn(embeddingQueueModule, 'scheduleDocumentEmbedding')
        .mockResolvedValue('document-dddddddd-dddd-4ddd-8ddd-dddddddddddd-emb-gen-2');

      vi.spyOn(documentEmbeddingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'queued',
        generation: 2,
        provider: 'mock',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        embeddedChunkCount: 0,
        errorCode: null,
        startedAt: null,
        embeddedAt: null,
        updatedAt: new Date().toISOString(),
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/embeddings/reprocess`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.embedding.generation).toBe(2);
      expect(res.body.data.embedding.status).toBe('queued');

      expect(schedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: mockActiveDoc.id,
          organizationId: orgA.id,
          processingGeneration: mockActiveDoc.processing_generation,
          embeddingGeneration: 2,
        })
      );
    });
  });

  describe('Document Embedding Background Worker Handler', () => {
    it('successfully generates embeddings and marks document completed', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue({
        ...mockActiveDoc,
        embedding_generation: 1,
        embedding_status: 'queued',
      });

      vi.spyOn(documentEmbeddingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'queued',
        generation: 1,
        provider: 'mock',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        embeddedChunkCount: 0,
        errorCode: null,
        startedAt: null,
        embeddedAt: null,
        updatedAt: new Date().toISOString(),
      });

      const updateSpy = vi
        .spyOn(documentEmbeddingRepository, 'updateStatus')
        .mockResolvedValue(true);

      vi.spyOn(documentEmbeddingClient, 'generateEmbeddings').mockResolvedValue({
        success: true,
        organizationId: orgA.id,
        documentId: mockActiveDoc.id,
        embeddingGeneration: 1,
        provider: 'mock',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        embeddingSpace: 'mock:text-embedding-3-small:1536',
        totalChunks: 5,
        embeddedChunks: 5,
        failedChunks: 0,
        status: 'completed',
        durationMs: 120,
      });

      const mockJob = {
        id: 'job-emb-success',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: mockActiveDoc.id,
          organizationId: orgA.id,
          processingGeneration: 1,
          embeddingGeneration: 1,
        } as DocumentEmbeddingJobData,
      } as Job<DocumentEmbeddingJobData>;

      const result = await handleDocumentEmbeddingJob(mockJob);
      expect(result.status).toBe('completed');
      expect(result.embeddedChunks).toBe(5);

      expect(updateSpy).toHaveBeenCalledWith(
        orgA.id,
        mockActiveDoc.id,
        1,
        expect.objectContaining({
          status: 'completed',
          embeddedChunkCount: 5,
          model: 'text-embedding-3-small',
          dimensions: 1536,
        })
      );
    });

    it('skips superseded embedding generations gracefully', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue({
        ...mockActiveDoc,
        embedding_generation: 3, // Current generation is newer
        embedding_status: 'processing',
      });

      vi.spyOn(documentEmbeddingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'processing',
        generation: 3, // Superseded!
        provider: 'mock',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        embeddedChunkCount: 0,
        errorCode: null,
        startedAt: null,
        embeddedAt: null,
        updatedAt: new Date().toISOString(),
      });

      const updateSpy = vi.spyOn(documentEmbeddingRepository, 'updateStatus');

      const mockJob = {
        id: 'job-emb-superseded',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: mockActiveDoc.id,
          organizationId: orgA.id,
          processingGeneration: 1,
          embeddingGeneration: 1, // Stale job
        } as DocumentEmbeddingJobData,
      } as Job<DocumentEmbeddingJobData>;

      const result = await handleDocumentEmbeddingJob(mockJob);
      expect(result.status).toBe('skipped');
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('skips archived documents gracefully', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue({
        ...mockActiveDoc,
        status: 'archived',
        archived_at: new Date(),
      });

      const mockJob = {
        id: 'job-emb-archived',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: mockActiveDoc.id,
          organizationId: orgA.id,
          processingGeneration: 1,
          embeddingGeneration: 1,
        } as DocumentEmbeddingJobData,
      } as Job<DocumentEmbeddingJobData>;

      await expect(handleDocumentEmbeddingJob(mockJob)).rejects.toThrow('DOCUMENT_ARCHIVED');
    });

    it('marks document as failed and throws UnrecoverableError on terminal 422 errors', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue({
        ...mockActiveDoc,
        embedding_generation: 1,
        embedding_status: 'queued',
      });

      vi.spyOn(documentEmbeddingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'queued',
        generation: 1,
        provider: 'mock',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        embeddedChunkCount: 0,
        errorCode: null,
        startedAt: null,
        embeddedAt: null,
        updatedAt: new Date().toISOString(),
      });

      const updateSpy = vi
        .spyOn(documentEmbeddingRepository, 'updateStatus')
        .mockResolvedValue(true);

      vi.spyOn(documentEmbeddingClient, 'generateEmbeddings').mockRejectedValue(
        new AiEmbeddingClientError(
          'Embedding dimension mismatch',
          'EMBEDDING_DIMENSION_MISMATCH',
          false,
          422
        )
      );

      const mockJob = {
        id: 'job-emb-terminal',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: mockActiveDoc.id,
          organizationId: orgA.id,
          processingGeneration: 1,
          embeddingGeneration: 1,
        } as DocumentEmbeddingJobData,
      } as Job<DocumentEmbeddingJobData>;

      await expect(handleDocumentEmbeddingJob(mockJob)).rejects.toThrow(
        'Embedding dimension mismatch'
      );

      expect(updateSpy).toHaveBeenCalledWith(
        orgA.id,
        mockActiveDoc.id,
        1,
        expect.objectContaining({
          status: 'failed',
          errorCode: 'EMBEDDING_DIMENSION_MISMATCH',
        })
      );
    });

    it('re-throws retryable 500 errors to trigger BullMQ exponential backoff', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue({
        ...mockActiveDoc,
        embedding_generation: 1,
        embedding_status: 'queued',
      });

      vi.spyOn(documentEmbeddingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'queued',
        generation: 1,
        provider: 'mock',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        embeddedChunkCount: 0,
        errorCode: null,
        startedAt: null,
        embeddedAt: null,
        updatedAt: new Date().toISOString(),
      });

      const updateSpy = vi
        .spyOn(documentEmbeddingRepository, 'updateStatus')
        .mockResolvedValue(true);

      vi.spyOn(documentEmbeddingClient, 'generateEmbeddings').mockRejectedValue(
        new AiEmbeddingClientError(
          'OpenAI API rate limit exceeded',
          'EMBEDDING_RATE_LIMITED',
          true,
          500
        )
      );

      const mockJob = {
        id: 'job-emb-retryable',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: mockActiveDoc.id,
          organizationId: orgA.id,
          processingGeneration: 1,
          embeddingGeneration: 1,
        } as DocumentEmbeddingJobData,
      } as Job<DocumentEmbeddingJobData>;

      await expect(handleDocumentEmbeddingJob(mockJob)).rejects.toThrow(
        'OpenAI API rate limit exceeded'
      );

      expect(updateSpy).toHaveBeenCalledWith(
        orgA.id,
        mockActiveDoc.id,
        1,
        expect.objectContaining({
          status: 'queued',
          errorCode: 'EMBEDDING_RATE_LIMITED',
        })
      );
    });
  });
});
