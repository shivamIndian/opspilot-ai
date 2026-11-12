import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { aiWorkflowClient } from '../src/modules/agent-workflows/client/ai-workflow.client.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';

describe('OpsPilot API – Agent Monitoring (Module 22)', () => {
  const orgId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const adminId = '11111111-1111-4111-8111-111111111111';
  const memberId = '22222222-2222-4222-8222-222222222222';
  const testRunId = '99999999-9999-4999-8999-999999999999';

  const adminUser: UserEntity = {
    id: adminId,
    name: 'Admin User',
    email: 'admin@opspilot.test',
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

  const memberUser: UserEntity = {
    id: memberId,
    name: 'Regular Member',
    email: 'member@opspilot.test',
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

  const org: OrganizationEntity = {
    id: orgId,
    name: 'OpsPilot Monitoring Test Org',
    slug: 'opspilot-monitoring-test',
    description: 'Org for testing agent monitoring',
    logo_url: null,
    status: 'active',
    created_by_user_id: adminId,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const adminMember: OrganizationMemberEntity = {
    id: 'mem-admin-1',
    organization_id: orgId,
    user_id: adminId,
    role: 'admin',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const regularMember: OrganizationMemberEntity = {
    id: 'mem-user-2',
    organization_id: orgId,
    user_id: memberId,
    role: 'member',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const getJwt = (user: UserEntity) =>
    tokenService.generateAccessToken(user.id, user.platform_role).token;

  let adminToken: string;
  let memberToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();

    adminToken = getJwt(adminUser);
    memberToken = getJwt(memberUser);

    vi.spyOn(organizationRepository, 'findById').mockResolvedValue(org);
    vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(async (targetOrgId, userId) => {
      if (targetOrgId !== orgId) return null;
      if (userId === adminId) return adminMember;
      if (userId === memberId) return regularMember;
      return null;
    });
  });

  it('GET /overview returns aggregated metrics for organization owner/admin', async () => {
    vi.spyOn(aiWorkflowClient, 'getWorkflowAnalytics').mockResolvedValue({
      total_runs: 42,
      successful_runs: 38,
      failed_runs: 2,
      waiting_approval_runs: 2,
      running_runs: 0,
      success_rate: 90.5,
      avg_duration_ms: 1250.0,
      total_tool_calls: 56,
      recent_runs: [
        {
          id: testRunId,
          thread_id: 'thread-1',
          status: 'completed',
          intent: 'knowledge_question',
          selected_tool: 'search_knowledge_base',
          duration_ms: 850.0,
          created_at: '2026-11-04T12:00:00Z',
        },
      ],
    });

    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/agent-monitoring/overview`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRuns).toBe(42);
    expect(res.body.data.successfulRuns).toBe(38);
    expect(res.body.data.successRate).toBe(90.5);
    expect(res.body.data.recentRuns).toHaveLength(1);
    expect(res.body.data.recentRuns[0].id).toBe(testRunId);
  });

  it('GET /overview denies access to non-admin member (403 FORBIDDEN)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/agent-monitoring/overview`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /runs returns paginated workflow runs list', async () => {
    vi.spyOn(aiWorkflowClient, 'listWorkflowRuns').mockResolvedValue({
      items: [
        {
          id: testRunId,
          run_id: testRunId,
          thread_id: 'thread-1',
          organization_id: orgId,
          user_id: adminId,
          workflow_name: 'opspilot_support_workflow',
          workflow_version: 'v1.0',
          status: 'completed',
          intent: 'knowledge_question',
          selected_tool: 'search_knowledge_base',
          requires_approval: false,
          proposal_id: null,
          error_code: null,
          started_at: '2026-11-04T12:00:00Z',
          completed_at: '2026-11-04T12:00:01Z',
          duration_ms: 1000.0,
          total_steps: 2,
          completed_steps_count: 2,
          tool_call_count: 1,
          created_at: '2026-11-04T12:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    });

    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/agent-monitoring/runs?status=completed&page=1&limit=20`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].status).toBe('completed');
  });

  it('GET /runs/:runId returns detailed run telemetry', async () => {
    vi.spyOn(aiWorkflowClient, 'getRunStatus').mockResolvedValue({
      run_id: testRunId,
      thread_id: 'thread-1',
      organization_id: orgId,
      status: 'awaiting_approval',
      intent: 'ticket_update_request',
      selected_tool: 'tickets_update_priority',
      answer: null,
      citations: [],
      insufficient_evidence: false,
      requires_approval: true,
      proposal_id: 'prop-123',
      error_code: null,
      duration_ms: 600.0,
      total_steps: 2,
      completed_steps: ['step_1'],
      tool_call_count: 1,
      replan_count: 0,
      action_proposals: [],
      execution_summary: 'Proposed priority escalation to urgent.',
    });

    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/agent-monitoring/runs/${testRunId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.run_id).toBe(testRunId);
    expect(res.body.data.requires_approval).toBe(true);
    expect(res.body.data.proposal_id).toBe('prop-123');
  });

  it('GET /runs/:runId/events generates structured lifecycle events timeline', async () => {
    vi.spyOn(aiWorkflowClient, 'getRunStatus').mockResolvedValue({
      run_id: testRunId,
      thread_id: 'thread-1',
      organization_id: orgId,
      status: 'completed',
      intent: 'ticket_lookup',
      selected_tool: 'tickets_get_details',
      answer: 'Found active ticket TICK-101.',
      citations: [],
      insufficient_evidence: false,
      requires_approval: false,
      proposal_id: null,
      error_code: null,
      duration_ms: 750.0,
      total_steps: 1,
      completed_steps: ['step_1'],
      tool_call_count: 1,
    });

    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/agent-monitoring/runs/${testRunId}/events`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const events = res.body.data;
    expect(events.length).toBeGreaterThanOrEqual(3);
    const eventTypes = events.map((e: any) => e.type);
    expect(eventTypes).toContain('workflow_started');
    expect(eventTypes).toContain('plan_generated');
    expect(eventTypes).toContain('tool_executed');
    expect(eventTypes).toContain('workflow_completed');
  });

  it('GET /tool-executions aggregates tool usage frequencies', async () => {
    vi.spyOn(aiWorkflowClient, 'listWorkflowRuns').mockResolvedValue({
      items: [
        {
          id: 'run-1',
          run_id: 'run-1',
          thread_id: 'thread-1',
          organization_id: orgId,
          user_id: adminId,
          workflow_name: 'opspilot_support_workflow',
          workflow_version: 'v1.0',
          status: 'completed',
          selected_tool: 'search_knowledge_base',
          requires_approval: false,
          total_steps: 1,
          completed_steps_count: 1,
          tool_call_count: 2,
        },
        {
          id: 'run-2',
          run_id: 'run-2',
          thread_id: 'thread-2',
          organization_id: orgId,
          user_id: adminId,
          workflow_name: 'opspilot_support_workflow',
          workflow_version: 'v1.0',
          status: 'awaiting_approval',
          selected_tool: 'tickets_update_priority',
          requires_approval: true,
          total_steps: 1,
          completed_steps_count: 0,
          tool_call_count: 1,
        },
      ],
      total: 2,
      page: 1,
      limit: 50,
      total_pages: 1,
    });

    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/agent-monitoring/tool-executions`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].toolName).toBe('search_knowledge_base');
    expect(res.body.data[0].totalCalls).toBe(2);
    expect(res.body.data[1].toolName).toBe('tickets_update_priority');
    expect(res.body.data[1].requiresApprovalCount).toBe(1);
  });
});
