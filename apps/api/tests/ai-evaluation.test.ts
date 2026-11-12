import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { aiEvaluationClient } from '../src/modules/ai-evaluation/client/ai-evaluation.client.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';

describe('OpsPilot API – AI Evaluation Framework (Module 23)', () => {
  const orgId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const adminId = '11111111-1111-4111-8111-111111111111';
  const memberId = '22222222-2222-4222-8222-222222222222';
  const testDsId = '33333333-3333-4333-8333-333333333333';
  const testRunIdA = '44444444-4444-4444-8444-444444444444';
  const testRunIdB = '55555555-5555-4555-8555-555555555555';

  const adminUser: UserEntity = {
    id: adminId,
    name: 'Admin Evaluator',
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
    name: 'OpsPilot Evaluation Test Org',
    slug: 'opspilot-eval-test',
    description: 'Org for testing AI evaluation',
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

  it('GET /datasets returns datasets for authorized staff', async () => {
    vi.spyOn(aiEvaluationClient, 'listDatasets').mockResolvedValue([
      {
        id: testDsId,
        organization_id: orgId,
        name: 'Core Support RAG Benchmark',
        description: 'Standard benchmark for information retrieval',
        category: 'rag_retrieval',
        version: 1,
        example_count: 5,
        created_at: '2026-11-04T12:00:00Z',
        updated_at: '2026-11-04T12:00:00Z',
      },
    ]);

    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/ai-evaluation/datasets`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Core Support RAG Benchmark');
  });

  it('POST /datasets creates a new benchmark evaluation dataset', async () => {
    vi.spyOn(aiEvaluationClient, 'createDataset').mockResolvedValue({
      id: testDsId,
      organization_id: orgId,
      name: 'Agent Triage Benchmark',
      description: 'Testing tool routing accuracy',
      category: 'agent_tool_selection',
      version: 1,
      example_count: 2,
      created_at: '2026-11-04T12:00:00Z',
      updated_at: '2026-11-04T12:00:00Z',
    });

    const res = await request(app)
      .post(`/api/v1/organizations/${orgId}/ai-evaluation/datasets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Agent Triage Benchmark',
        description: 'Testing tool routing accuracy',
        category: 'agent_tool_selection',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testDsId);
    expect(res.body.data.category).toBe('agent_tool_selection');
  });

  it('POST /runs launches an evaluation benchmark execution', async () => {
    vi.spyOn(aiEvaluationClient, 'startRun').mockResolvedValue({
      id: testRunIdA,
      organization_id: orgId,
      dataset_id: testDsId,
      dataset_name: 'Core Support RAG Benchmark',
      dataset_version: 1,
      category: 'rag_retrieval',
      model_provider: 'mock',
      model_name: 'mock-evaluator',
      rubric_version: 'rubric_v1.0',
      status: 'completed',
      total_examples: 5,
      completed_examples: 5,
      failed_examples: 0,
      summary_metrics: {
        mean_recall_at_5: 0.85,
        mean_precision_at_5: 0.42,
        mrr: 0.9,
        overall_score: 85.0,
      },
      error_summary: null,
      started_at: '2026-11-04T12:00:00Z',
      completed_at: '2026-11-04T12:00:02Z',
      created_at: '2026-11-04T12:00:00Z',
    });

    const res = await request(app)
      .post(`/api/v1/organizations/${orgId}/ai-evaluation/runs`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        datasetId: testDsId,
        modelProvider: 'mock',
        modelName: 'mock-evaluator',
        evaluatorMode: 'hybrid',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testRunIdA);
    expect(res.body.data.summary_metrics.mean_recall_at_5).toBe(0.85);
  });

  it('GET /compare compares baseline and candidate runs', async () => {
    vi.spyOn(aiEvaluationClient, 'compareRuns').mockResolvedValue({
      run_a: {
        id: testRunIdA,
        organization_id: orgId,
        dataset_id: testDsId,
        dataset_version: 1,
        category: 'rag_retrieval',
        status: 'completed',
        total_examples: 5,
        completed_examples: 5,
        failed_examples: 0,
        summary_metrics: { overall_score: 80.0, mean_recall_at_5: 0.8 },
        created_at: '2026-11-04T12:00:00Z',
      },
      run_b: {
        id: testRunIdB,
        organization_id: orgId,
        dataset_id: testDsId,
        dataset_version: 1,
        category: 'rag_retrieval',
        status: 'completed',
        total_examples: 5,
        completed_examples: 5,
        failed_examples: 0,
        summary_metrics: { overall_score: 85.0, mean_recall_at_5: 0.85 },
        created_at: '2026-11-04T12:05:00Z',
      },
      score_deltas: {
        overall_score: 5.0,
        mean_recall_at_5: 0.05,
      },
      comparable: true,
      notes: 'Comparison between Run A and Run B.',
    });

    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/ai-evaluation/compare?runIdA=${testRunIdA}&runIdB=${testRunIdB}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comparable).toBe(true);
    expect(res.body.data.score_deltas.overall_score).toBe(5.0);
  });

  it('denies access to non-admin member (403 FORBIDDEN)', async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/ai-evaluation/datasets`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
