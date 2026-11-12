import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import {
  aiWorkflowClient,
  AiWorkflowClientError,
} from '../src/modules/agent-workflows/client/ai-workflow.client.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';
import type { WorkflowRunData } from '../src/modules/agent-workflows/types/workflow.types.js';

describe('OpsPilot API – LangGraph Workflow Engine (Module 12)', () => {
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

    // Mock organization lookups
    vi.spyOn(organizationRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === orgA.id) return orgA;
      return null;
    });

    // Mock membership lookups
    vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(
      async (orgId: string, uId: string) => {
        if (orgId === orgA.id && uId === userMember.id) {
          return memberA;
        }
        return null;
      }
    );
  });

  describe('Workflow Execution API (POST /agent/workflows/run)', () => {
    it('returns 401 Unauthorized when access token is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/workflows/run`)
        .send({ query: 'How do I deploy a cluster?' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 Forbidden when user is not a member of the organization', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/workflows/run`)
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({ query: 'Show me all production tickets' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('returns 400 Validation Error when query is empty', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/workflows/run`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ query: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 Validation Error when query exceeds maximum length', async () => {
      const longQuery = 'A'.repeat(5001);
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/workflows/run`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ query: longQuery });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('successfully executes a knowledge workflow run and returns answer with citations', async () => {
      const mockResult: WorkflowRunData = {
        run_id: 'rrrrrrrr-rrrr-4rrr-8rrr-rrrrrrrrrrrr',
        thread_id: 'tttttttt-tttt-4ttt-8ttt-tttttttttttt',
        organization_id: orgA.id,
        status: 'completed',
        intent: 'knowledge_search',
        selected_tool: null,
        answer: 'To deploy a cluster, run kubectl apply -f k8s/production.yaml.',
        citations: [
          {
            chunk_id: 'c1',
            document_id: 'd1',
            filename: 'deployment-guide.md',
            score: 0.94,
            snippet: 'Kubernetes cluster deployment instructions',
          },
        ],
        insufficient_evidence: false,
        requires_approval: false,
        proposal: null,
        proposal_id: null,
        error_code: null,
        duration_ms: 185.5,
      };

      const runSpy = vi.spyOn(aiWorkflowClient, 'runWorkflow').mockResolvedValueOnce(mockResult);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/workflows/run`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          query: 'How do I deploy a cluster?',
          workflowVersion: 'v1.0',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.run_id).toBe(mockResult.run_id);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.answer).toContain('kubectl apply');
      expect(res.body.data.citations).toHaveLength(1);

      // Verify delegation token and runtime context passed to AI client
      expect(runSpy).toHaveBeenCalledOnce();
      const callArgs = runSpy.mock.calls[0][0];
      expect(callArgs.organizationId).toBe(orgA.id);
      expect(callArgs.authenticatedUserId).toBe(userMember.id);
      expect(callArgs.delegatedAuthorizationToken).toBeDefined();
      expect(callArgs.permittedScopes).toContain('tickets:read');
      expect(callArgs.permittedScopes).toContain('tickets:write');
    });

    it('successfully handles a ticket creation proposal requiring human approval', async () => {
      const mockProposalResult: WorkflowRunData = {
        run_id: 'rrrrrrrr-rrrr-4rrr-8rrr-rrrrrrrrrrrr',
        thread_id: 'tttttttt-tttt-4ttt-8ttt-tttttttttttt',
        organization_id: orgA.id,
        status: 'awaiting_approval',
        intent: 'ticket_creation',
        selected_tool: 'create_support_ticket',
        answer: 'I have prepared a proposal to create ticket: Database latency spike.',
        citations: [],
        insufficient_evidence: false,
        requires_approval: true,
        proposal: {
          proposal_id: 'prop-123',
          tool_name: 'create_support_ticket',
          proposed_action: {
            title: 'Database latency spike',
            priority: 'high',
          },
          risk_level: 'medium',
          requires_approval: true,
          status: 'awaiting_approval',
        },
        proposal_id: 'prop-123',
        error_code: null,
        duration_ms: 210.0,
      };

      vi.spyOn(aiWorkflowClient, 'runWorkflow').mockResolvedValueOnce(mockProposalResult);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/workflows/run`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          query: 'Create a high-priority ticket for database latency spike',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('awaiting_approval');
      expect(res.body.data.requires_approval).toBe(true);
      expect(res.body.data.proposal).toBeDefined();
      expect(res.body.data.proposal.tool_name).toBe('create_support_ticket');
    });

    it('handles AI workflow service network or timeout error (503)', async () => {
      vi.spyOn(aiWorkflowClient, 'runWorkflow').mockRejectedValueOnce(
        new AiWorkflowClientError(
          'Connection refused to AI engine',
          'AI_WORKFLOW_SERVICE_UNAVAILABLE',
          503
        )
      );

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/agent/workflows/run`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ query: 'Check system health' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_WORKFLOW_SERVICE_UNAVAILABLE');
    });
  });

  describe('Workflow Run Status Retrieval (GET /agent/workflows/:runId)', () => {
    const validRunId = '99999999-9999-4999-8999-999999999999';

    it('returns 400 when runId is not a valid UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/agent/workflows/not-a-uuid`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when workflow run does not exist', async () => {
      vi.spyOn(aiWorkflowClient, 'getRunStatus').mockRejectedValueOnce(
        new AiWorkflowClientError('Workflow run not found', 'WORKFLOW_NOT_FOUND', 404)
      );

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/agent/workflows/${validRunId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('WORKFLOW_NOT_FOUND');
    });

    it('enforces tenant isolation and rejects access if run belongs to a different organization', async () => {
      const foreignOrgId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
      const crossTenantRunData: WorkflowRunData = {
        run_id: validRunId,
        thread_id: 'tttttttt-tttt-4ttt-8ttt-tttttttttttt',
        organization_id: foreignOrgId, // belongs to another tenant!
        status: 'completed',
        answer: 'Confidential foreign org data',
        citations: [],
        insufficient_evidence: false,
        requires_approval: false,
      };

      vi.spyOn(aiWorkflowClient, 'getRunStatus').mockResolvedValueOnce(crossTenantRunData);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/agent/workflows/${validRunId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('WORKFLOW_NOT_FOUND');
    });

    it('returns workflow run status successfully for authorized tenant', async () => {
      const runData: WorkflowRunData = {
        run_id: validRunId,
        thread_id: 'tttttttt-tttt-4ttt-8ttt-tttttttttttt',
        organization_id: orgA.id,
        status: 'completed',
        intent: 'knowledge_search',
        answer: 'Resolved run output',
        citations: [],
        insufficient_evidence: false,
        requires_approval: false,
        duration_ms: 120.0,
      };

      vi.spyOn(aiWorkflowClient, 'getRunStatus').mockResolvedValueOnce(runData);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/agent/workflows/${validRunId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.run_id).toBe(validRunId);
      expect(res.body.data.organization_id).toBe(orgA.id);
      expect(res.body.data.status).toBe('completed');
    });
  });
});
