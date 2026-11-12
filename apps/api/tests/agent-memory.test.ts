import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import {
  aiMemoryClient,
  AiMemoryClientError,
} from '../src/modules/agent-memory/client/ai-memory.client.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';

describe('OpsPilot API – Persistent Agent Memory & Context Management (Module 15)', () => {
  const userMember: UserEntity = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Dev Engineer',
    email: 'dev@example.com',
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
    id: '22222222-2222-4222-8222-222222222222',
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
    name: 'Acme Cloud Corp',
    slug: 'acme-cloud',
    description: 'Cloud provider',
    logo_url: null,
    status: 'active',
    created_by_user_id: userMember.id,
    created_at: new Date(),
    updated_at: new Date(),
    archived_at: null,
  };

  const memberA: OrganizationMemberEntity = {
    id: 'mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmmm',
    organization_id: orgA.id,
    user_id: userMember.id,
    role: 'member',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const getJwt = (user: UserEntity) =>
    tokenService.generateAccessToken(user.id, user.platform_role).token;

  let memberToken: string;
  let foreignToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();

    memberToken = getJwt(userMember);
    foreignToken = getJwt(userForeign);

    // Mock organization lookup
    vi.spyOn(organizationRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === orgA.id) return orgA;
      return null;
    });

    // Mock membership lookup
    vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(
      async (orgId: string, uId: string) => {
        if (orgId === orgA.id && uId === userMember.id) {
          return memberA;
        }
        return null;
      }
    );
  });

  describe('Authentication & Privacy Scoping Guardrails', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/agent/memories`)
        .send();

      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not an active member of organization', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/agent/memories`)
        .set('Authorization', `Bearer ${foreignToken}`)
        .send();

      expect(res.status).toBe(403);
    });

    it('enforces privacy invariant: returns 403 when user tries to access another users memories', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/agent/memories?user_id=${userForeign.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MEMORY_ACCESS_DENIED');
    });
  });

  describe('Memory CRUD & Lifecycle Operations', () => {
    it('lists user memories successfully', async () => {
      const mockList = {
        items: [
          {
            id: '55555555-5555-4555-8555-555555555555',
            organization_id: orgA.id,
            user_id: userMember.id,
            memory_type: 'preference' as const,
            category: 'ui',
            title: 'Dark Theme Preference',
            content: 'Always use dark theme',
            content_hash: 'hash123',
            importance_score: 8,
            status: 'active' as const,
            consent_version: 'v1.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };

      vi.spyOn(aiMemoryClient, 'listMemories').mockResolvedValue(mockList);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/agent/memories`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].title).toBe('Dark Theme Preference');
    });

    it('creates a memory item successfully', async () => {
      const mockCreated = {
        id: '66666666-6666-4666-8666-666666666666',
        organization_id: orgA.id,
        user_id: userMember.id,
        memory_type: 'preference' as const,
        category: 'dev',
        title: 'TypeScript preference',
        content: 'Prefers TypeScript over plain JavaScript',
        content_hash: 'hash456',
        importance_score: 9,
        status: 'active' as const,
        consent_version: 'v1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.spyOn(aiMemoryClient, 'createMemory').mockResolvedValue(mockCreated);

      const payload = {
        memory_type: 'preference',
        category: 'dev',
        title: 'TypeScript preference',
        content: 'Prefers TypeScript over plain JavaScript',
        importance_score: 9,
      };

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/memories`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockCreated.id);
    });

    it('rejects memory creation when consent is disabled (403)', async () => {
      vi.spyOn(aiMemoryClient, 'createMemory').mockRejectedValue(
        new AiMemoryClientError('User has memory consent disabled', 'MEMORY_CONSENT_REQUIRED', 403)
      );

      const payload = {
        memory_type: 'preference',
        category: 'dev',
        title: 'TypeScript preference',
        content: 'Prefers TypeScript over plain JavaScript',
      };

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/memories`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MEMORY_CONSENT_REQUIRED');
    });

    it('rejects memory creation with sensitive credentials (422)', async () => {
      vi.spyOn(aiMemoryClient, 'createMemory').mockRejectedValue(
        new AiMemoryClientError(
          'Proposed memory content rejected by security screening: Credential detected',
          'MEMORY_SCREENING_REJECTED',
          422,
          { violations: ['OpenAI API Key'] }
        )
      );

      const payload = {
        memory_type: 'preference',
        category: 'sec',
        title: 'API key secret',
        content: 'sk-1234567890abcdefghijklmnopqrstuvwxyz12',
      };

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/memories`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(payload);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('MEMORY_SCREENING_REJECTED');
    });

    it('rejects duplicate active memory creation (409)', async () => {
      vi.spyOn(aiMemoryClient, 'createMemory').mockRejectedValue(
        new AiMemoryClientError(
          'Identical active memory already exists',
          'MEMORY_DUPLICATE',
          409
        )
      );

      const payload = {
        memory_type: 'preference',
        category: 'dev',
        title: 'Identical Title',
        content: 'Identical Content',
      };

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/memories`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('MEMORY_DUPLICATE');
    });

    it('deletes a memory item successfully', async () => {
      vi.spyOn(aiMemoryClient, 'deleteMemory').mockResolvedValue({
        success: true,
        id: 'mem-123',
      });

      const res = await request(app)
        .delete(`/api/v1/organizations/${orgA.id}/agent/memories/mem-123`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('purges all user memories on demand', async () => {
      vi.spyOn(aiMemoryClient, 'bulkPurgeMemories').mockResolvedValue({
        deleted_count: 5,
        user_id: userMember.id,
        organization_id: orgA.id,
        status: 'success',
      });

      const res = await request(app)
        .delete(`/api/v1/organizations/${orgA.id}/agent/memories`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.data.deleted_count).toBe(5);
    });
  });

  describe('Memory Settings & Consent Management', () => {
    it('retrieves user consent settings', async () => {
      const mockSettings = {
        id: 'set-123',
        organization_id: orgA.id,
        user_id: userMember.id,
        memory_enabled: false,
        memory_extraction_enabled: false,
        episodic_memory_enabled: false,
        retention_days: null,
        consent_version: 'v1.0',
        updated_at: new Date().toISOString(),
      };

      vi.spyOn(aiMemoryClient, 'getSettings').mockResolvedValue(mockSettings);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/agent/memory-settings`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.data.memory_enabled).toBe(false);
    });

    it('updates user consent settings successfully', async () => {
      const mockUpdated = {
        id: 'set-123',
        organization_id: orgA.id,
        user_id: userMember.id,
        memory_enabled: true,
        memory_extraction_enabled: true,
        episodic_memory_enabled: true,
        retention_days: 90,
        consent_version: 'v1.0',
        updated_at: new Date().toISOString(),
      };

      vi.spyOn(aiMemoryClient, 'updateSettings').mockResolvedValue(mockUpdated);

      const payload = {
        memory_enabled: true,
        memory_extraction_enabled: true,
        episodic_memory_enabled: true,
        retention_days: 90,
      };

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/agent/memory-settings`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.data.memory_enabled).toBe(true);
      expect(res.body.data.retention_days).toBe(90);
    });
  });

  describe('Semantic Retrieval & Candidate Extraction', () => {
    it('performs semantic memory search successfully', async () => {
      const mockSearchRes = {
        results: [
          {
            memory: {
              id: 'mem-1',
              organization_id: orgA.id,
              user_id: userMember.id,
              memory_type: 'preference' as const,
              category: 'dev',
              title: 'FastAPI and Python preference',
              content: 'Prefers FastAPI for AI endpoints',
              content_hash: 'hash789',
              importance_score: 8,
              status: 'active' as const,
              consent_version: 'v1.0',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            score: 0.91,
            citation_text: '[Memory: FastAPI and Python preference] Prefers FastAPI for AI endpoints',
          },
        ],
        total: 1,
        query: 'What framework do we use for AI services?',
      };

      vi.spyOn(aiMemoryClient, 'searchMemories').mockResolvedValue(mockSearchRes);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/memories/search`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ query: 'What framework do we use for AI services?' });

      expect(res.status).toBe(200);
      expect(res.body.data.results.length).toBe(1);
      expect(res.body.data.results[0].score).toBe(0.91);
    });

    it('extracts candidate memory proposals from conversation transcript', async () => {
      const mockSuggestions = {
        candidates: [
          {
            candidate_id: 'cand-1',
            memory_type: 'preference' as const,
            category: 'deployment',
            title: 'Prefers Terraform for IaC',
            content: 'User explicitly mentioned that all infrastructure must use Terraform.',
            importance_score: 8,
            confidence: 0.92,
            reasoning: 'Explicit declaration in chat',
          },
        ],
        conversation_id: 'conv-123',
        detected_count: 1,
      };

      vi.spyOn(aiMemoryClient, 'extractSuggestions').mockResolvedValue(mockSuggestions);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/memories/suggestions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          conversation_id: 'conv-123',
          messages: [
            {"role": "user", "content": "We only use Terraform for cloud infrastructure."},
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.candidates.length).toBe(1);
      expect(res.body.data.candidates[0].title).toBe('Prefers Terraform for IaC');
    });
  });
});
