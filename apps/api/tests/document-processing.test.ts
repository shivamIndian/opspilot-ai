import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Readable } from 'node:stream';
import { app } from '../src/app.js';
import { pool } from '../src/database/index.js';
import { documentRepository } from '../src/modules/documents/repositories/document.repository.js';
import { documentProcessingRepository } from '../src/modules/documents/processing/document-processing.repository.js';
import * as queueModule from '../src/queues/document-processing.queue.js';
import { handleDocumentProcessingJob } from '../src/workers/document-processing.handlers.js';
import {
  documentProcessingClient,
  AiProcessingClientError,
} from '../src/modules/documents/processing/document-processing.client.js';
import { StorageFactory } from '../src/modules/documents/storage/storage.factory.js';
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
import type { DocumentProcessingJobData } from '../src/modules/documents/processing/document-processing.types.js';

describe('OpsPilot API – Document Processing Pipeline Module 07', () => {
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
    id: '99999999-9999-4999-8999-999999999991',
    organization_id: orgA.id,
    uploaded_by_user_id: userOwner.id,
    original_filename: 'knowledge-base.pdf',
    display_name: 'Knowledge Base',
    description: 'Internal documentation',
    storage_provider: 'local',
    storage_key: 'uploads/mock.pdf',
    size_bytes: 1024,
    mime_type: 'application/pdf',
    file_extension: 'pdf',
    sha256_checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'active',
    processing_status: 'completed',
    processing_generation: 1,
    processing_pipeline_version: 'document-pipeline-v1',
    processing_attempts: 1,
    page_count: 5,
    extracted_char_count: 4500,
    chunk_count: 6,
    processing_error_code: null,
    processed_at: new Date(),
    processing_started_at: new Date(),
    processing_updated_at: new Date(),
    archived_at: null,
    metadata: {},
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

  describe('GET /api/v1/organizations/:id/documents/:id/processing-status', () => {
    it('returns processing telemetry status for organization members', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue(mockActiveDoc);
      vi.spyOn(documentProcessingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'completed',
        generation: 1,
        chunkCount: 6,
        pageCount: 5,
        extractedCharCount: 4500,
        pipelineVersion: 'document-pipeline-v1',
        attempts: 1,
      });

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/processing-status`)
        .set('Authorization', `Bearer ${tokenMember}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.processing.documentId).toBe(mockActiveDoc.id);
      expect(res.body.data.processing.status).toBe('completed');
      expect(res.body.data.processing.chunkCount).toBe(6);
      expect(res.body.data.processing.pageCount).toBe(5);
      expect(res.body.data.processing.extractedCharCount).toBe(4500);
    });

    it('rejects foreign users not in the organization with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/processing-status`)
        .set('Authorization', `Bearer ${tokenForeign}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get(
        `/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/processing-status`
      );

      expect(res.status).toBe(401);
    });

    it('returns 404 when document does not exist', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(
          `/api/v1/organizations/${orgA.id}/documents/00000000-0000-0000-0000-000000000000/processing-status`
        )
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });

  describe('POST /api/v1/organizations/:id/documents/:id/process (Reprocess)', () => {
    it('allows owner or admin to trigger document reprocessing with 202 Accepted', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue(mockActiveDoc);
      const incSpy = vi
        .spyOn(documentProcessingRepository, 'incrementGenerationAndSetQueued')
        .mockResolvedValue({
          generation: 2,
          status: 'queued',
        });

      vi.spyOn(documentProcessingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'queued',
        generation: 2,
        chunkCount: 0,
        pipelineVersion: 'document-pipeline-v1',
        attempts: 0,
      });

      const schedSpy = vi
        .spyOn(queueModule, 'scheduleDocumentProcessing')
        .mockResolvedValue('job-123');

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/process`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.processing.status).toBe('queued');
      expect(res.body.data.processing.generation).toBe(2);
      expect(incSpy).toHaveBeenCalledWith(orgA.id, mockActiveDoc.id, 'document-pipeline-v1');
      expect(schedSpy).toHaveBeenCalled();
    });

    it('forbids standard members without admin/owner role with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/process`)
        .set('Authorization', `Bearer ${tokenMember}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects reprocessing archived documents with 400', async () => {
      const archivedDoc: DocumentWithUploaderEntity = {
        ...mockActiveDoc,
        status: 'archived',
        archived_at: new Date(),
      };
      vi.spyOn(documentRepository, 'findById').mockResolvedValue(archivedDoc);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents/${mockActiveDoc.id}/process`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DOCUMENT_ARCHIVED');
    });
  });

  describe('Document Processing Worker Handler', () => {
    it('skips processing if job generation is stale', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue(mockActiveDoc);
      vi.spyOn(documentProcessingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'processing',
        generation: 5, // Newer than job generation 2
        chunkCount: 0,
        pipelineVersion: 'document-pipeline-v1',
        attempts: 1,
      });

      const mockJob = {
        id: 'job-stale',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: mockActiveDoc.id,
          organizationId: orgA.id,
          processingGeneration: 2, // Older than 5
          pipelineVersion: 'document-pipeline-v1',
          storageKey: mockActiveDoc.storage_key,
          originalFilename: mockActiveDoc.original_filename,
          mimeType: mockActiveDoc.mime_type,
          fileExtension: mockActiveDoc.file_extension,
          sha256Checksum: mockActiveDoc.sha256_checksum,
        } as DocumentProcessingJobData,
      } as Job<DocumentProcessingJobData>;

      const result = await handleDocumentProcessingJob(mockJob);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('SUPERSEDED_GENERATION');
    });

    it('successfully processes document and updates repository metrics', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue({
        ...mockActiveDoc,
        processing_generation: 1,
        processing_status: 'queued',
      });

      vi.spyOn(documentProcessingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'queued',
        generation: 1,
        chunkCount: 0,
        pipelineVersion: 'document-pipeline-v1',
        attempts: 0,
      });

      const updateSpy = vi.spyOn(documentProcessingRepository, 'updateStatus').mockResolvedValue({
        ...mockActiveDoc,
        processing_status: 'completed',
      });

      const mockProvider = {
        readStream: vi.fn().mockResolvedValue(Readable.from(Buffer.from('sample content'))),
      };
      vi.spyOn(StorageFactory, 'getProvider').mockReturnValue(mockProvider as any);

      vi.spyOn(documentProcessingClient, 'sendToAiService').mockResolvedValue({
        success: true,
        documentId: mockActiveDoc.id,
        organizationId: orgA.id,
        processingGeneration: 1,
        status: 'completed',
        pageCount: 5,
        extractedCharCount: 2400,
        chunkCount: 3,
        pipelineVersion: 'document-pipeline-v1',
      });

      const mockJob = {
        id: 'job-valid',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: mockActiveDoc.id,
          organizationId: orgA.id,
          processingGeneration: 1,
          pipelineVersion: 'document-pipeline-v1',
          storageKey: mockActiveDoc.storage_key,
          originalFilename: mockActiveDoc.original_filename,
          mimeType: mockActiveDoc.mime_type,
          fileExtension: mockActiveDoc.file_extension,
          sha256Checksum: mockActiveDoc.sha256_checksum,
        } as DocumentProcessingJobData,
      } as Job<DocumentProcessingJobData>;

      const result = await handleDocumentProcessingJob(mockJob);

      expect(result.status).toBe('completed');
      expect(result.chunkCount).toBe(3);
      expect(updateSpy).toHaveBeenCalledWith(
        orgA.id,
        mockActiveDoc.id,
        1,
        expect.objectContaining({
          status: 'completed',
          chunkCount: 3,
          pageCount: 5,
          extractedCharCount: 2400,
        })
      );
    });

    it('marks document as failed and throws UnrecoverableError on non-retryable 422 errors', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue({
        ...mockActiveDoc,
        processing_generation: 1,
        processing_status: 'queued',
      });

      vi.spyOn(documentProcessingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'queued',
        generation: 1,
        chunkCount: 0,
        pipelineVersion: 'document-pipeline-v1',
        attempts: 0,
      });

      const updateSpy = vi
        .spyOn(documentProcessingRepository, 'updateStatus')
        .mockResolvedValue(mockActiveDoc);

      const mockProvider = {
        readStream: vi.fn().mockResolvedValue(Readable.from(Buffer.from('corrupted content'))),
      };
      vi.spyOn(StorageFactory, 'getProvider').mockReturnValue(mockProvider as any);

      vi.spyOn(documentProcessingClient, 'sendToAiService').mockRejectedValue(
        new AiProcessingClientError(
          'Document has no extractable text',
          'NO_EXTRACTABLE_TEXT',
          false,
          422
        )
      );

      const mockJob = {
        id: 'job-fail-terminal',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: mockActiveDoc.id,
          organizationId: orgA.id,
          processingGeneration: 1,
          pipelineVersion: 'document-pipeline-v1',
          storageKey: mockActiveDoc.storage_key,
          originalFilename: mockActiveDoc.original_filename,
          mimeType: mockActiveDoc.mime_type,
          fileExtension: mockActiveDoc.file_extension,
          sha256Checksum: mockActiveDoc.sha256_checksum,
        } as DocumentProcessingJobData,
      } as Job<DocumentProcessingJobData>;

      await expect(handleDocumentProcessingJob(mockJob)).rejects.toThrow(
        'Document has no extractable text'
      );

      expect(updateSpy).toHaveBeenCalledWith(
        orgA.id,
        mockActiveDoc.id,
        1,
        expect.objectContaining({
          status: 'failed',
          errorCode: 'NO_EXTRACTABLE_TEXT',
        })
      );
    });

    it('re-throws retryable 500 errors to trigger BullMQ exponential backoff', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValue({
        ...mockActiveDoc,
        processing_generation: 1,
        processing_status: 'queued',
      });

      vi.spyOn(documentProcessingRepository, 'getStatus').mockResolvedValue({
        documentId: mockActiveDoc.id,
        status: 'queued',
        generation: 1,
        chunkCount: 0,
        pipelineVersion: 'document-pipeline-v1',
        attempts: 0,
      });

      const updateSpy = vi
        .spyOn(documentProcessingRepository, 'updateStatus')
        .mockResolvedValue(mockActiveDoc);

      const mockProvider = {
        readStream: vi.fn().mockResolvedValue(Readable.from(Buffer.from('sample content'))),
      };
      vi.spyOn(StorageFactory, 'getProvider').mockReturnValue(mockProvider as any);

      vi.spyOn(documentProcessingClient, 'sendToAiService').mockRejectedValue(
        new AiProcessingClientError(
          'AI service temporary failure',
          'INTERNAL_PROCESSING_ERROR',
          true,
          500
        )
      );

      const mockJob = {
        id: 'job-retryable',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          documentId: mockActiveDoc.id,
          organizationId: orgA.id,
          processingGeneration: 1,
          pipelineVersion: 'document-pipeline-v1',
          storageKey: mockActiveDoc.storage_key,
          originalFilename: mockActiveDoc.original_filename,
          mimeType: mockActiveDoc.mime_type,
          fileExtension: mockActiveDoc.file_extension,
          sha256Checksum: mockActiveDoc.sha256_checksum,
        } as DocumentProcessingJobData,
      } as Job<DocumentProcessingJobData>;

      await expect(handleDocumentProcessingJob(mockJob)).rejects.toThrow(
        'AI service temporary failure'
      );

      expect(updateSpy).toHaveBeenCalledWith(
        orgA.id,
        mockActiveDoc.id,
        1,
        expect.objectContaining({
          status: 'queued',
          errorCode: 'INTERNAL_PROCESSING_ERROR',
        })
      );
    });
  });
});
