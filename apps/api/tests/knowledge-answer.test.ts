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
import { aiLlmClient, AiLlmClientError } from '../src/modules/knowledge/client/ai-llm.client.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';
import type {
  AiSearchResponse,
  InternalLLMGenerateResponse,
} from '../src/modules/knowledge/types/knowledge.types.js';

describe('OpsPilot API – LLM Integration & Knowledge Answer Module 10', () => {
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
  ];

  const getJwt = (user: UserEntity) =>
    tokenService.generateAccessToken(user.id, user.platform_role).token;

  let memberToken: string;
  let foreignToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();

    memberToken = getJwt(userMember);
    foreignToken = getJwt(userForeign);

    // Mock organization lookups
    vi.spyOn(organizationRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === orgA.id) return orgA;
      return null;
    });

    vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(
      async (orgId: string, userId: string) => {
        if (orgId === orgA.id && userId === userMember.id) return memberInA;
        return null;
      }
    );

    vi.spyOn(organizationAuditRepository, 'logEvent').mockResolvedValue({} as any);

    // Mock database queries for app.users and app.documents
    vi.spyOn(pool, 'query').mockImplementation(async (text: any, params?: any[]) => {
      const q = typeof text === 'string' ? text : text.text;

      if (q.includes('FROM app.users WHERE id = $1')) {
        const id = params?.[0];
        if (id === userMember.id) return { rows: [userMember], rowCount: 1 } as any;
        if (id === userForeign.id) return { rows: [userForeign], rowCount: 1 } as any;
        return { rows: [], rowCount: 0 } as any;
      }

      if (q.includes('FROM app.documents')) {
        const docIds = (params?.[1] as string[]) || [];
        const matching = mockDbDocs.filter(d => docIds.includes(d.id));
        return { rows: matching, rowCount: matching.length } as any;
      }

      return { rows: [], rowCount: 0 } as any;
    });
  });

  describe('POST /api/v1/organizations/:organizationId/knowledge/answer', () => {
    it('returns 200 with grounded answer and valid citations when matching active documents exist', async () => {
      const mockRetrievalResponse: AiSearchResponse = {
        success: true,
        data: {
          organization_id: orgA.id,
          query: 'How to reset password?',
          retrieval_mode: 'hybrid',
          embedding_space: 'openai:text-embedding-3-small:1536',
          result_count: 1,
          results: [
            {
              chunk_id: '11111111-2222-3333-4444-555555555555',
              document_id: validDocId,
              organization_id: orgA.id,
              processing_run_id: 'run-1',
              processing_generation: 2,
              chunk_index: 0,
              content: 'You can reset your password by going to account settings.',
              char_start: 0,
              char_end: 57,
              page_start: 1,
              page_end: 1,
              section_title: 'Security',
              chunk_metadata: {},
              semantic_rank: 1,
              semantic_score: 0.9,
              keyword_rank: 1,
              keyword_score: 0.8,
              score: 0.032,
              score_type: 'rrf',
              retrieval_method: 'hybrid',
            },
          ],
          diagnostics: {
            query_normalized: 'how to reset password',
            embedding_space: 'openai:text-embedding-3-small:1536',
            semantic_candidates: 1,
            keyword_candidates: 1,
            combined_candidates: 1,
            returned_results: 1,
            embedding_duration_ms: 10,
            search_duration_ms: 15,
            total_duration_ms: 25,
          },
        },
      };

      const mockLlmResponse: InternalLLMGenerateResponse = {
        success: true,
        data: {
          request_id: 'req-1',
          answer: 'You can reset your account password by visiting the account settings page.',
          cited_source_ids: ['S1'],
          insufficient_evidence: false,
          limitations: [],
          follow_up_questions: ['Would you like a direct link to security settings?'],
          metadata: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            prompt_version: 'rag_assistant_v1',
            retrieval_mode: 'hybrid',
            usage: {
              input_tokens: 120,
              output_tokens: 28,
              total_tokens: 148,
            },
            latency_ms: 240,
          },
        },
      };

      vi.spyOn(aiRetrievalClient, 'search').mockResolvedValue(mockRetrievalResponse);
      vi.spyOn(aiLlmClient, 'generate').mockResolvedValue(mockLlmResponse);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/answer`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          query: 'How to reset password?',
          retrievalMode: 'hybrid',
          topK: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.answer).toContain('visiting the account settings page');
      expect(res.body.data.insufficientEvidence).toBe(false);
      expect(res.body.data.citations).toHaveLength(1);
      expect(res.body.data.citations[0].sourceId).toBe('S1');
      expect(res.body.data.citations[0].documentName).toBe('Employee Handbook');
      expect(res.body.data.citations[0].pageStart).toBe(1);
      expect(res.body.data.citations[0].sectionTitle).toBe('Security');
      expect(res.body.data.metadata.provider).toBe('openai');
      expect(res.body.data.metadata.usage.totalTokens).toBe(148);
    });

    it('returns 200 with insufficient evidence when no active documents match query', async () => {
      const mockEmptyRetrieval: AiSearchResponse = {
        success: true,
        data: {
          organization_id: orgA.id,
          query: 'What is the refund policy?',
          retrieval_mode: 'hybrid',
          embedding_space: 'openai:text-embedding-3-small:1536',
          result_count: 0,
          results: [],
          diagnostics: {
            query_normalized: 'what is the refund policy',
            embedding_space: 'openai:text-embedding-3-small:1536',
            semantic_candidates: 0,
            keyword_candidates: 0,
            combined_candidates: 0,
            returned_results: 0,
            embedding_duration_ms: 10,
            search_duration_ms: 10,
            total_duration_ms: 20,
          },
        },
      };

      vi.spyOn(aiRetrievalClient, 'search').mockResolvedValue(mockEmptyRetrieval);
      const llmSpy = vi.spyOn(aiLlmClient, 'generate');

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/answer`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          query: 'What is the refund policy?',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.insufficientEvidence).toBe(true);
      expect(res.body.data.citations).toHaveLength(0);
      expect(res.body.data.answer).toContain('could not find sufficient information');
      // LLM generation must not be invoked on empty retrieval fast path
      expect(llmSpy).not.toHaveBeenCalled();
    });

    it('strips hallucinated citation IDs returned by the model', async () => {
      const mockRetrievalResponse: AiSearchResponse = {
        success: true,
        data: {
          organization_id: orgA.id,
          query: 'How to configure MFA?',
          retrieval_mode: 'hybrid',
          embedding_space: 'openai:text-embedding-3-small:1536',
          result_count: 1,
          results: [
            {
              chunk_id: '11111111-2222-3333-4444-555555555555',
              document_id: validDocId,
              organization_id: orgA.id,
              processing_run_id: 'run-1',
              processing_generation: 2,
              chunk_index: 0,
              content: 'Enable MFA via Authenticator app.',
              char_start: 0,
              char_end: 33,
              page_start: 3,
              page_end: 3,
              section_title: 'MFA',
              chunk_metadata: {},
              semantic_rank: 1,
              semantic_score: 0.9,
              keyword_rank: 1,
              keyword_score: 0.8,
              score: 0.032,
              score_type: 'rrf',
              retrieval_method: 'hybrid',
            },
          ],
          diagnostics: {
            query_normalized: 'how to configure mfa',
            embedding_space: 'openai:text-embedding-3-small:1536',
            semantic_candidates: 1,
            keyword_candidates: 1,
            combined_candidates: 1,
            returned_results: 1,
            embedding_duration_ms: 10,
            search_duration_ms: 10,
            total_duration_ms: 20,
          },
        },
      };

      // Model returned S1 and a non-existent S99
      const mockLlmResponse: InternalLLMGenerateResponse = {
        success: true,
        data: {
          request_id: 'req-2',
          answer: 'Enable MFA in your profile.',
          cited_source_ids: ['S1', 'S99'],
          insufficient_evidence: false,
          limitations: [],
          follow_up_questions: [],
          metadata: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            prompt_version: 'rag_assistant_v1',
            retrieval_mode: 'hybrid',
            usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
            latency_ms: 200,
          },
        },
      };

      vi.spyOn(aiRetrievalClient, 'search').mockResolvedValue(mockRetrievalResponse);
      vi.spyOn(aiLlmClient, 'generate').mockResolvedValue(mockLlmResponse);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/answer`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          query: 'How to configure MFA?',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.citations).toHaveLength(1);
      expect(res.body.data.citations[0].sourceId).toBe('S1');
      // S99 should not appear in citations
      expect(res.body.data.citations.some((c: any) => c.sourceId === 'S99')).toBe(false);
    });

    it('rejects 401 when request is unauthenticated', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/answer`)
        .send({ query: 'How to reset password?' });

      expect(res.status).toBe(401);
    });

    it('rejects 403 when user is not a member of the organization', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/answer`)
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({ query: 'How to reset password?' });

      expect(res.status).toBe(403);
    });

    it('handles AI LLM service failure gracefully with error code', async () => {
      const mockRetrievalResponse: AiSearchResponse = {
        success: true,
        data: {
          organization_id: orgA.id,
          query: 'Test query',
          retrieval_mode: 'hybrid',
          embedding_space: 'openai:text-embedding-3-small:1536',
          result_count: 1,
          results: [
            {
              chunk_id: '11111111-2222-3333-4444-555555555555',
              document_id: validDocId,
              organization_id: orgA.id,
              processing_run_id: 'run-1',
              processing_generation: 2,
              chunk_index: 0,
              content: 'Some content',
              char_start: 0,
              char_end: 12,
              page_start: 1,
              page_end: 1,
              section_title: 'Intro',
              chunk_metadata: {},
              semantic_rank: 1,
              semantic_score: 0.9,
              keyword_rank: 1,
              keyword_score: 0.8,
              score: 0.032,
              score_type: 'rrf',
              retrieval_method: 'hybrid',
            },
          ],
          diagnostics: {
            query_normalized: 'test query',
            embedding_space: 'openai:text-embedding-3-small:1536',
            semantic_candidates: 1,
            keyword_candidates: 1,
            combined_candidates: 1,
            returned_results: 1,
            embedding_duration_ms: 10,
            search_duration_ms: 10,
            total_duration_ms: 20,
          },
        },
      };

      vi.spyOn(aiRetrievalClient, 'search').mockResolvedValue(mockRetrievalResponse);
      vi.spyOn(aiLlmClient, 'generate').mockRejectedValue(
        new AiLlmClientError('LLM rate limit reached', 'LLM_RATE_LIMITED', true, 429)
      );

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/knowledge/answer`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ query: 'Test query' });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('LLM_RATE_LIMITED');
    });
  });
});
