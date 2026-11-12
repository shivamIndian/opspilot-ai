import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Readable } from 'node:stream';
import { app } from '../src/app.js';
import { pool } from '../src/database/index.js';
import { documentRepository } from '../src/modules/documents/repositories/document.repository.js';
import { StorageFactory } from '../src/modules/documents/storage/storage.factory.js';
import { LocalStorageProvider } from '../src/modules/documents/storage/local-storage.provider.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { organizationAuditRepository } from '../src/modules/organizations/repositories/organization-audit.repository.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import * as queueModule from '../src/queues/document-processing.queue.js';
import { documentProcessingRepository } from '../src/modules/documents/processing/document-processing.repository.js';
import type {
  DocumentEntity,
  DocumentWithUploaderEntity,
} from '../src/modules/documents/types/document.types.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';

describe('OpsPilot API – Enterprise Document Management Module 06', () => {
  // Test Users
  const userA: UserEntity = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Alice Owner',
    email: 'alice@example.com',
    password_hash: 'hashA',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const userB: UserEntity = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Bob Admin',
    email: 'bob@example.com',
    password_hash: 'hashB',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const userC: UserEntity = {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Charlie Member',
    email: 'charlie@example.com',
    password_hash: 'hashC',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const userD: UserEntity = {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'David Foreign',
    email: 'david@example.com',
    password_hash: 'hashD',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Organizations
  const orgA: OrganizationEntity = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Acme Corp',
    slug: 'acme-corp',
    description: 'First org',
    logo_url: null,
    status: 'active',
    created_by: userA.id,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const orgB: OrganizationEntity = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Beta Global',
    slug: 'beta-global',
    description: 'Second org',
    logo_url: null,
    status: 'active',
    created_by: userD.id,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Memberships
  const memberAliceInA: OrganizationMemberEntity = {
    id: '55555555-5555-4555-8555-555555555551',
    organization_id: orgA.id,
    user_id: userA.id,
    role: 'owner',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberBobInA: OrganizationMemberEntity = {
    id: '55555555-5555-4555-8555-555555555552',
    organization_id: orgA.id,
    user_id: userB.id,
    role: 'admin',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberCharlieInA: OrganizationMemberEntity = {
    id: '55555555-5555-4555-8555-555555555553',
    organization_id: orgA.id,
    user_id: userC.id,
    role: 'member',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberDavidInB: OrganizationMemberEntity = {
    id: '55555555-5555-4555-8555-555555555554',
    organization_id: orgB.id,
    user_id: userD.id,
    role: 'owner',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Sample Documents
  const mockDoc1: DocumentWithUploaderEntity = {
    id: '99999999-9999-4999-8999-999999999991',
    organization_id: orgA.id,
    uploaded_by_user_id: userC.id,
    original_filename: 'user-guide.pdf',
    display_name: 'Product User Guide',
    description: 'Comprehensive manual for enterprise operations',
    file_extension: 'pdf',
    mime_type: 'application/pdf',
    size_bytes: 31,
    sha256_checksum: 'a'.repeat(64),
    storage_provider: 'local',
    storage_key: 'guid-1111.pdf',
    status: 'active',
    metadata: { validationVersion: '1.0' },
    created_at: new Date('2026-11-03T10:00:00Z'),
    updated_at: new Date('2026-11-03T10:00:00Z'),
    archived_at: null,
    uploader_name: userC.name,
    uploader_email: userC.email,
  };

  const mockDoc2: DocumentWithUploaderEntity = {
    id: '99999999-9999-4999-8999-999999999992',
    organization_id: orgA.id,
    uploaded_by_user_id: userA.id,
    original_filename: 'archived-spec.docx',
    display_name: 'Archived Tech Spec',
    description: 'Old architecture document',
    file_extension: 'docx',
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size_bytes: 2048,
    sha256_checksum: 'b'.repeat(64),
    storage_provider: 'local',
    storage_key: 'guid-2222.docx',
    status: 'archived',
    metadata: { validationVersion: '1.0' },
    created_at: new Date('2026-11-03T09:00:00Z'),
    updated_at: new Date('2026-11-03T09:30:00Z'),
    archived_at: new Date('2026-11-03T09:30:00Z'),
    uploader_name: userA.name,
    uploader_email: userA.email,
  };

  const mockDocInB: DocumentWithUploaderEntity = {
    id: '99999999-9999-4999-8999-999999999999',
    organization_id: orgB.id,
    uploaded_by_user_id: userD.id,
    original_filename: 'secret-b.pdf',
    display_name: 'Org B Secret Plan',
    description: 'Internal only to Org B',
    file_extension: 'pdf',
    mime_type: 'application/pdf',
    size_bytes: 512,
    sha256_checksum: 'c'.repeat(64),
    storage_provider: 'local',
    storage_key: 'guid-9999.pdf',
    status: 'active',
    metadata: {},
    created_at: new Date('2026-11-03T08:00:00Z'),
    updated_at: new Date('2026-11-03T08:00:00Z'),
    archived_at: null,
    uploader_name: userD.name,
    uploader_email: userD.email,
  };

  const getJwt = (user: UserEntity) =>
    tokenService.generateAccessToken(user.id, user.platform_role).token;

  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock Pool client for transaction methods
    const mockClient = {
      query: vi.fn().mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    vi.spyOn(pool, 'connect').mockResolvedValue(mockClient as any);
    vi.spyOn(pool, 'query').mockImplementation(async () => ({ rows: [] }) as any);

    // Mock Organization Context resolution
    vi.spyOn(organizationRepository, 'findById').mockImplementation(async id => {
      if (id === orgA.id) return orgA;
      if (id === orgB.id) return orgB;
      return null;
    });

    vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(async (orgId, userId) => {
      if (orgId === orgA.id && userId === userA.id) return memberAliceInA;
      if (orgId === orgA.id && userId === userB.id) return memberBobInA;
      if (orgId === orgA.id && userId === userC.id) return memberCharlieInA;
      if (orgId === orgB.id && userId === userD.id) return memberDavidInB;
      return null;
    });

    // Mock storage provider
    const storageProvider = StorageFactory.getProvider();
    vi.spyOn(storageProvider, 'save').mockResolvedValue({
      storageKey: 'mock-saved-key.pdf',
      sizeBytes: 1024,
      sha256Checksum: 'mock-sha256',
    });
    const testBuffer = Buffer.from('Mock file binary stream content');
    vi.spyOn(storageProvider, 'readStream').mockImplementation(async () =>
      Readable.from(testBuffer)
    );
    vi.spyOn(storageProvider, 'delete').mockResolvedValue(true);
    vi.spyOn(storageProvider, 'exists').mockResolvedValue(true);

    // Mock audit logs
    vi.spyOn(organizationAuditRepository, 'logEvent').mockResolvedValue({} as any);

    // Mock BullMQ background queue scheduling
    vi.spyOn(queueModule, 'scheduleDocumentProcessing').mockResolvedValue('job-mock');
    vi.spyOn(documentProcessingRepository, 'updateStatus').mockResolvedValue(true);
  });

  describe('1. File Upload & Validation', () => {
    it('successfully uploads a valid .txt document', async () => {
      const fileBuffer = Buffer.from('OpsPilot enterprise knowledge text document.');

      vi.spyOn(documentRepository, 'create').mockResolvedValueOnce({
        ...mockDoc1,
        id: '12345678-1234-4234-8234-123456789012',
        file_extension: 'txt',
        mime_type: 'text/plain; charset=utf-8',
        original_filename: 'knowledge.txt',
        display_name: 'Knowledge Base',
      } as DocumentEntity);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .attach('file', fileBuffer, 'knowledge.txt')
        .field('displayName', 'Knowledge Base')
        .field('description', 'Test document upload');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document).toBeDefined();
      expect(res.body.data.document.fileExtension).toBe('txt');
    });

    it('successfully uploads a valid .pdf document with %PDF- signature', async () => {
      const pdfHeader = Buffer.from('%PDF-1.7\nSample PDF payload stream\n%%EOF');

      vi.spyOn(documentRepository, 'create').mockResolvedValueOnce({
        ...mockDoc1,
        id: '12345678-1234-4234-8234-123456789013',
      } as DocumentEntity);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .attach('file', pdfHeader, 'guide.pdf')
        .field('displayName', 'Product Guide');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document.fileExtension).toBe('pdf');
    });

    it('successfully uploads a valid .docx document with ZIP signature and OOXML marker', async () => {
      // PK\x03\x04 + [Content_Types].xml marker
      const docxHeader = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.from('word/[Content_Types].xml document content'),
      ]);

      vi.spyOn(documentRepository, 'create').mockResolvedValueOnce({
        ...mockDoc1,
        file_extension: 'docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        original_filename: 'spec.docx',
      } as DocumentEntity);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .attach('file', docxHeader, 'spec.docx');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document.fileExtension).toBe('docx');
    });

    it('rejects unsupported file extension (.exe)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .attach('file', Buffer.from('MZ binary executable'), 'malicious.exe');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DOCUMENT_FILE');
      expect(res.body.error.message).toContain('is not supported');
    });

    it('rejects spoofed PDF file lacking %PDF- signature', async () => {
      const fakePdfBuffer = Buffer.from('<html><body>Fake PDF with HTML content</body></html>');

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .attach('file', fakePdfBuffer, 'fake.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DOCUMENT_FILE');
      expect(res.body.error.message).toContain('genuine PDF magic signature');
    });

    it('rejects text files containing binary null bytes', async () => {
      const binaryInText = Buffer.from('Valid text line\x00and null byte injected');

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .attach('file', binaryInText, 'corrupted.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DOCUMENT_FILE');
      expect(res.body.error.message).toContain('Binary null bytes');
    });

    it('rejects request when no file is attached', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({ displayName: 'Missing file document' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_FILE');
    });
  });

  describe('2. Multi-Tenant Isolation & Zero-Trust Context', () => {
    it('prevents user from accessing documents of an organization they do not belong to', async () => {
      // User C belongs to Org A, attempts to list documents from Org B
      const res = await request(app)
        .get(`/api/v1/organizations/${orgB.id}/documents`)
        .set('Authorization', `Bearer ${getJwt(userC)}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('prevents cross-tenant document download even with knowledge of document ID', async () => {
      // User C (Org A) requests docInB (Org B) via Org A path
      vi.spyOn(documentRepository, 'findById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/documents/${mockDocInB.id}/download`)
        .set('Authorization', `Bearer ${getJwt(userC)}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('path traversal guard in storage provider throws error', () => {
      const localStorage = new LocalStorageProvider('.data/test-storage');
      expect(() => {
        localStorage.resolvePath(orgA.id, '../../../etc/passwd');
      }).toThrow('Path traversal detected');
    });
  });

  describe('3. Document Access Control & Permissions', () => {
    it('allows any active member to list and get document details', async () => {
      vi.spyOn(documentRepository, 'list').mockResolvedValueOnce({
        documents: [mockDoc1],
        total: 1,
      });

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/documents`)
        .set('Authorization', `Bearer ${getJwt(userC)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documents.length).toBe(1);
    });

    it('allows document uploader to update document display name and description', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValueOnce(mockDoc1);
      vi.spyOn(documentRepository, 'updateMetadata').mockResolvedValueOnce({
        ...mockDoc1,
        display_name: 'Renamed Guide',
        description: 'Updated notes',
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/documents/${mockDoc1.id}`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({
          displayName: 'Renamed Guide',
          description: 'Updated notes',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('forbids normal member from updating documents uploaded by another user', async () => {
      // User B (Admin) uploaded doc2, User C (Member) tries to update it
      vi.spyOn(documentRepository, 'findById').mockResolvedValueOnce({
        ...mockDoc1,
        uploaded_by_user_id: userA.id, // Uploaded by Alice, not Charlie
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/documents/${mockDoc1.id}`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({ displayName: 'Hacked Title' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows organization admin to update any document metadata', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValueOnce(mockDoc1);
      vi.spyOn(documentRepository, 'updateMetadata').mockResolvedValueOnce({
        ...mockDoc1,
        display_name: 'Admin Edited Name',
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/documents/${mockDoc1.id}`)
        .set('Authorization', `Bearer ${getJwt(userB)}`) // Bob is Admin
        .send({ displayName: 'Admin Edited Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('forbids normal member from archiving a document', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents/${mockDoc1.id}/archive`)
        .set('Authorization', `Bearer ${getJwt(userC)}`); // Charlie is Member

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows organization owner to archive and restore a document', async () => {
      vi.spyOn(documentRepository, 'findById')
        .mockResolvedValueOnce(mockDoc1)
        .mockResolvedValueOnce({ ...mockDoc1, status: 'archived', archived_at: new Date() });
      vi.spyOn(documentRepository, 'archive').mockResolvedValueOnce({
        ...mockDoc1,
        status: 'archived',
        archived_at: new Date(),
      });

      // Archive
      const resArchive = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents/${mockDoc1.id}/archive`)
        .set('Authorization', `Bearer ${getJwt(userA)}`); // Alice is Owner

      expect(resArchive.status).toBe(200);
      expect(resArchive.body.success).toBe(true);

      // Restore
      vi.spyOn(documentRepository, 'findById').mockResolvedValueOnce({
        ...mockDoc1,
        status: 'archived',
        archived_at: new Date(),
      });
      vi.spyOn(documentRepository, 'restore').mockResolvedValueOnce({
        ...mockDoc1,
        status: 'active',
        archived_at: null,
      });

      const resRestore = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/documents/${mockDoc1.id}/restore`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(resRestore.status).toBe(200);
      expect(resRestore.body.success).toBe(true);
    });
  });

  describe('4. Secure Streaming Downloads', () => {
    it('streams active document with safe security headers', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValueOnce(mockDoc1);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/documents/${mockDoc1.id}/download`)
        .set('Authorization', `Bearer ${getJwt(userC)}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cache-control']).toBe('private, no-store');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('user-guide.pdf');
    });

    it('rejects download of archived documents', async () => {
      vi.spyOn(documentRepository, 'findById').mockResolvedValueOnce(mockDoc2); // mockDoc2 is archived

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/documents/${mockDoc2.id}/download`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCUMENT_ARCHIVED');
    });
  });
});
