import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/index.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { organizationAuditRepository } from '../src/modules/organizations/repositories/organization-audit.repository.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import {
  aiRetrievalClient,
  AiRetrievalClientError,
} from '../src/modules/knowledge/client/ai-retrieval.client.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';
import type { AiSearchResponse } from '../src/modules/knowledge/types/knowledge.types.js';

describe('OpsPilot API – RAG Retrieval Engine Module 09', () => {
  // Test Users
  const userMember: UserEntity = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Standard Member',
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
    created_by: userMember.id,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberInA: OrganizationMemberEntity = {
    id: '55555555-5555-4555-8555-555555555551',
    organization_id: orgA.id,
    user_id: userMember.id,
    role: 'member',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const validDocId = '44444444-4444-4444-8444-444444444444';
  const archivedDocId = '66666666-6666-4666-8666-666666666666';
  const staleGenDocId = '77777777-7777-4777-8777-777777777777';

  const mockDbDocs = [
    {
      id: validDocId,
      organization_id: orgA.id,
      display_name: 'Employee Handbook',
      original_filename: 'handbook.pdf',
      file_extension: 'pdf',
      status: 'active',
      archived_at: null,
      processing_status: 'completed',
      processing_generation: 2,
      embedding_status: 'completed',
    },
    {
      id: archivedDocId,
      organization_id: orgA.id,
      display_name: 'Archived IT Policy',
      original_filename: 'it-policy.docx',
      file_extension: 'docx',
      status: 'archived',
      archived_at: new Date(),
      processing_status: 'completed',
      processing_generation: 1,
      embedding_status: 'completed',
    },
    {
      id: staleGenDocId,
      organization_id: orgA.id,
      display_name: 'Security Whitepaper',
      original_filename: 'security.md',
      file_extension: 'md',
      status: 'active',
      archived_at: null,
      processing_status: 'completed',
      processing_generation: 3, // Authoritative generation is 3
      embedding_status: 'completed',
    },
  ];

  const getJwt = (user: UserEntity) =>
    tokenService.generateAccessToken(user.id, user.platform_role).token;

  let tokenMember: string;
  let tokenForeign: string;

  beforeEach(() => {
    vi.restoreAllMocks();

    tokenMember = getJwt(userMember);
    tokenForeign = getJwt(userForeign);

    // Mock Pool queries
    vi.spyOn(pool, 'query').mockImplementation(async (text: any, params?: any[]) => {
      const q = typeof text === 'string' ? text : text.text;

      if (q.includes('FROM app.users WHERE id = $1')) {
        const id = params?.[0];
        if (id === userMember.id) return { rows: [userMember], rowCount: 1 } as any;
        if (id === userForeign.id) return { rows: [userForeign], rowCount: 1 } as any;
        return { rows: [], rowCount: 0 } as any;
      }

      if (q.includes('FROM app.documents')) {
        const requestedIds = params?.[1] || [];
        const matched = mockDbDocs.filter(d => requestedIds.includes(d.id));
        return { rows: matched, rowCount: matched.length } as any;
      }

      return { rows: [], rowCount: 0 } as any;
    });

    vi.spyOn(organizationRepository, 'findById').mockImplementation(async id => {
      if (id === orgA.id) return orgA;
      return null;
    });

    vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(async (orgId, userId) => {
      if (orgId === orgA.id && userId === userMember.id) return memberInA;
      return null;
    });

    vi.spyOn(organizationAuditRepository, 'logEvent').mockResolvedValue({} as any);
  });

  describe('POST /api/v1/organizations/:organizationId/knowledge/search', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/search`)
        .send({ query: 'password reset' });

      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not a member of the organization', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/search`)
        .set('Authorization', `Bearer ${tokenForeign}`)
        .send({ query: 'password reset' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('returns 400 when query is empty or whitespace', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/search`)
        .set('Authorization', `Bearer ${tokenMember}`)
        .send({ query: '    ' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when topK is outside allowed range (1-20)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/search`)
        .set('Authorization', `Bearer ${tokenMember}`)
        .send({ query: 'test query', topK: 50 });

      expect(res.status).toBe(400);
    });

    it('returns 200 with valid hybrid retrieval and filters out archived or stale candidates', async () => {
      const chunkValid = '11111111-2222-3333-4444-555555555555';
      const chunkArchived = '22222222-3333-4444-5555-666666666666';
      const chunkStale = '33333333-4444-5555-6666-777777777777';

      const mockAiResponse: AiSearchResponse = {
        success: true,
        data: {
          organization_id: orgA.id,
          query: 'password reset procedure',
          retrieval_mode: 'hybrid',
          embedding_space: 'openai:text-embedding-3-small:1536',
          result_count: 3,
          results: [
            // 1. Valid active candidate with matching generation (2 == 2)
            {
              chunk_id: chunkValid,
              document_id: validDocId,
              organization_id: orgA.id,
              processing_run_id: '88888888-8888-4888-8888-888888888888',
              processing_generation: 2,
              chunk_index: 3,
              content:
                'To reset your password, visit the enterprise portal and click Forgot Password.',
              char_start: 1200,
              char_end: 1280,
              page_start: 12,
              page_end: 12,
              section_title: 'Account Security',
              chunk_metadata: {},
              semantic_rank: 1,
              semantic_score: 0.88,
              keyword_rank: 1,
              keyword_score: 0.42,
              score: 0.0325,
              score_type: 'rrf',
              retrieval_method: 'hybrid',
            },
            // 2. Candidate from an archived document (should be rejected!)
            {
              chunk_id: chunkArchived,
              document_id: archivedDocId,
              organization_id: orgA.id,
              processing_run_id: '99999999-9999-4999-8999-999999999999',
              processing_generation: 1,
              chunk_index: 0,
              content: 'Old IT policy regarding password lengths.',
              char_start: 0,
              char_end: 45,
              page_start: 1,
              page_end: 1,
              section_title: 'Old Guidelines',
              chunk_metadata: {},
              semantic_rank: 2,
              semantic_score: 0.82,
              keyword_rank: null,
              keyword_score: null,
              score: 0.016,
              score_type: 'rrf',
              retrieval_method: 'semantic',
            },
            // 3. Candidate from a stale processing generation (chunk has gen 1, live doc has gen 3!)
            {
              chunk_id: chunkStale,
              document_id: staleGenDocId,
              organization_id: orgA.id,
              processing_run_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
              processing_generation: 1, // Stale! Live doc is 3
              chunk_index: 1,
              content: 'Outdated whitepaper encryption notes.',
              char_start: 50,
              char_end: 95,
              page_start: null,
              page_end: null,
              section_title: null,
              chunk_metadata: {},
              semantic_rank: 3,
              semantic_score: 0.79,
              keyword_rank: null,
              keyword_score: null,
              score: 0.015,
              score_type: 'rrf',
              retrieval_method: 'semantic',
            },
          ],
          diagnostics: {
            query_normalized: 'password reset procedure',
            embedding_space: 'openai:text-embedding-3-small:1536',
            semantic_candidates: 3,
            keyword_candidates: 1,
            combined_candidates: 4,
            returned_results: 3,
            embedding_duration_ms: 25,
            search_duration_ms: 18,
            total_duration_ms: 43,
            degraded_mode: null,
          },
        },
      };

      const aiSpy = vi.spyOn(aiRetrievalClient, 'search').mockResolvedValue(mockAiResponse);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/search`)
        .set('Authorization', `Bearer ${tokenMember}`)
        .send({
          query: 'password reset procedure',
          topK: 5,
          retrievalMode: 'hybrid',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(aiSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgA.id,
          query: 'password reset procedure',
          topK: 5,
          retrievalMode: 'hybrid',
        })
      );

      // Only the 1 valid candidate should survive authoritative document validation!
      expect(res.body.data.resultCount).toBe(1);
      expect(res.body.data.results).toHaveLength(1);

      const result = res.body.data.results[0];
      expect(result.chunkId).toBe(chunkValid);
      expect(result.rank).toBe(1);
      expect(result.retrievalMethod).toBe('hybrid');
      expect(result.scoreType).toBe('rrf');

      // Citation checks
      expect(result.citation.documentName).toBe('Employee Handbook');
      expect(result.citation.originalFilename).toBe('handbook.pdf');
      expect(result.citation.fileExtension).toBe('pdf');
      expect(result.citation.pageStart).toBe(12);
      expect(result.citation.sectionTitle).toBe('Account Security');

      // Context package checks
      expect(res.body.data.context.sourceCount).toBe(1);
      expect(res.body.data.context.passages).toHaveLength(1);
      expect(res.body.data.context.passages[0].documentName).toBe('Employee Handbook');
      expect(res.body.data.context.passages[0].page).toBe(12);
      expect(res.body.data.context.trustNotice).toContain('factual reference context');
    });

    it('returns 200 with empty results and context when no matching candidates exist', async () => {
      vi.spyOn(aiRetrievalClient, 'search').mockResolvedValue({
        success: true,
        data: {
          organization_id: orgA.id,
          query: 'quantum propulsion',
          retrieval_mode: 'hybrid',
          embedding_space: 'openai:text-embedding-3-small:1536',
          result_count: 0,
          results: [],
          diagnostics: {
            query_normalized: 'quantum propulsion',
            embedding_space: 'openai:text-embedding-3-small:1536',
            semantic_candidates: 0,
            keyword_candidates: 0,
            combined_candidates: 0,
            returned_results: 0,
            embedding_duration_ms: 20,
            search_duration_ms: 10,
            total_duration_ms: 30,
            degraded_mode: null,
          },
        },
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/search`)
        .set('Authorization', `Bearer ${tokenMember}`)
        .send({ query: 'quantum propulsion' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resultCount).toBe(0);
      expect(res.body.data.results).toEqual([]);
      expect(res.body.data.context.passages).toEqual([]);
      expect(res.body.data.context.sourceCount).toBe(0);
    });

    it('handles AI service failure gracefully with error code', async () => {
      vi.spyOn(aiRetrievalClient, 'search').mockRejectedValue(
        new AiRetrievalClientError(
          'AI service unavailable',
          'RETRIEVAL_SERVICE_UNAVAILABLE',
          true,
          503
        )
      );

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/search`)
        .set('Authorization', `Bearer ${tokenMember}`)
        .send({ query: 'how to reset' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RETRIEVAL_SERVICE_UNAVAILABLE');
    });
  });
});
