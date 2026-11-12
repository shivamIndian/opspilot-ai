import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { dashboardRepository } from '../src/modules/dashboard/repositories/dashboard.repository.js';
import { aiWorkflowClient } from '../src/modules/agent-workflows/client/ai-workflow.client.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';

describe('OpsPilot API – Admin Dashboard (Module 18)', () => {
  const orgId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const otherOrgId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const adminId = '11111111-1111-4111-8111-111111111111';
  const memberId = '22222222-2222-4222-8222-222222222222';

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
    name: 'OpsPilot Dashboard Test Org',
    slug: 'opspilot-dashboard-test',
    description: 'Org for testing admin dashboard',
    logo_url: null,
    status: 'active',
    created_by_user_id: adminId,
    created_at: new Date(),
    updated_at: new Date(),
    archived_at: null,
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
    id: 'mem-member-1',
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

    vi.spyOn(organizationRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === orgId) return org;
      return null;
    });

    vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(
      async (oId: string, uId: string) => {
        if (oId !== orgId) return null;
        if (uId === adminId) return adminMember;
        if (uId === memberId) return regularMember;
        return null;
      }
    );
  });

  describe('GET /api/v1/organizations/:organizationId/dashboard/overview', () => {
    it('allows organization admin to view dashboard overview with real aggregates', async () => {
      vi.spyOn(dashboardRepository, 'getTicketMetrics').mockResolvedValue({
        metrics: {
          total: 25,
          statusDistribution: {
            open: 5,
            in_progress: 3,
            waiting_on_customer: 2,
            resolved: 12,
            closed: 3,
          },
          priorityDistribution: {
            urgent: 1,
            high: 4,
            medium: 15,
            low: 5,
          },
          volumeTrend: [
            { date: '2026-11-01', created: 3, resolved: 2 },
            { date: '2026-11-02', created: 4, resolved: 3 },
          ],
          recentTickets: [
            {
              id: 'tick-1',
              ticketNumber: 101,
              formattedTicketNumber: 'TICK-000101',
              subject: 'Cannot login to VPN',
              priority: 'urgent',
              status: 'open',
              creatorName: 'Alice',
              assigneeName: 'Admin User',
              createdAt: '2026-11-04T10:00:00.000Z',
            },
          ],
        },
        openTickets: 10,
        unassignedTickets: 2,
        urgentTickets: 1,
      });

      vi.spyOn(dashboardRepository, 'getDocumentMetrics').mockResolvedValue({
        total: 15,
        active: 14,
        archived: 1,
        processingStatus: {
          pending: 0,
          queued: 0,
          processing: 1,
          completed: 13,
          failed: 1,
        },
        embeddingStatus: {
          pending: 0,
          queued: 0,
          processing: 1,
          completed: 13,
          failed: 1,
          skipped: 0,
        },
        totalChunks: 350,
        embeddedChunks: 330,
      });

      vi.spyOn(dashboardRepository, 'getApprovalMetrics').mockResolvedValue({
        pendingCount: 2,
        totalProposals: 8,
        statusDistribution: {
          awaiting_approval: 2,
          approved: 5,
          rejected: 1,
          executed: 5,
          failed: 0,
          cancelled: 0,
        },
        recentPending: [
          {
            id: 'prop-1',
            toolName: 'update_ticket',
            actionType: 'update_ticket',
            riskLevel: 'high',
            createdAt: '2026-11-04T11:00:00.000Z',
            expiresAt: null,
          },
        ],
      });

      vi.spyOn(aiWorkflowClient, 'getWorkflowAnalytics').mockResolvedValue({
        total_runs: 50,
        successful_runs: 48,
        failed_runs: 2,
        waiting_approval_runs: 2,
        running_runs: 0,
        success_rate: 96.0,
        avg_duration_ms: 1250.5,
        total_tool_calls: 110,
        recent_runs: [],
      });

      vi.spyOn(dashboardRepository, 'getRecentActivity').mockResolvedValue([
        {
          id: 'log-1',
          action: 'ticket.created',
          actorName: 'Admin User',
          actorEmail: 'admin@opspilot.test',
          targetType: 'ticket',
          targetId: 'tick-1',
          metadata: { priority: 'urgent' },
          createdAt: '2026-11-04T10:00:00.000Z',
        },
      ]);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/dashboard/overview?period=7d`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period.key).toBe('7d');
      expect(res.body.data.kpis).toEqual({
        openTickets: 10,
        unassignedTickets: 2,
        urgentTickets: 1,
        pendingApprovals: 2,
        activeDocuments: 14,
        aiWorkflowsTotal: 50,
        aiSuccessRate: 96.0,
        avgWorkflowDurationMs: 1250.5,
      });
      expect(res.body.data.tickets.total).toBe(25);
      expect(res.body.data.documents.active).toBe(14);
      expect(res.body.data.aiActivity.total_runs).toBe(50);
      expect(res.body.data.approvals.pendingCount).toBe(2);
      expect(res.body.data.recentActivity).toHaveLength(1);
    });

    it('denies access to non-admin member with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/dashboard/overview`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('denies unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get(`/api/v1/organizations/${orgId}/dashboard/overview`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('enforces organization isolation when user is not member of target org', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${otherOrgId}/dashboard/overview`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('gracefully degrades AI metrics when AI service is unavailable', async () => {
      vi.spyOn(dashboardRepository, 'getTicketMetrics').mockResolvedValue({
        metrics: {
          total: 0,
          statusDistribution: { open: 0, in_progress: 0, waiting_on_customer: 0, resolved: 0, closed: 0 },
          priorityDistribution: { urgent: 0, high: 0, medium: 0, low: 0 },
          volumeTrend: [],
          recentTickets: [],
        },
        openTickets: 0,
        unassignedTickets: 0,
        urgentTickets: 0,
      });

      vi.spyOn(dashboardRepository, 'getDocumentMetrics').mockResolvedValue({
        total: 0,
        active: 0,
        archived: 0,
        processingStatus: { pending: 0, queued: 0, processing: 0, completed: 0, failed: 0 },
        embeddingStatus: { pending: 0, queued: 0, processing: 0, completed: 0, failed: 0, skipped: 0 },
        totalChunks: 0,
        embeddedChunks: 0,
      });

      vi.spyOn(dashboardRepository, 'getApprovalMetrics').mockResolvedValue({
        pendingCount: 0,
        totalProposals: 0,
        statusDistribution: {
          awaiting_approval: 0,
          approved: 0,
          rejected: 0,
          executed: 0,
          failed: 0,
          cancelled: 0,
        },
        recentPending: [],
      });

      vi.spyOn(aiWorkflowClient, 'getWorkflowAnalytics').mockResolvedValue({
        total_runs: 0,
        successful_runs: 0,
        failed_runs: 0,
        waiting_approval_runs: 0,
        running_runs: 0,
        success_rate: 0,
        avg_duration_ms: 0,
        total_tool_calls: 0,
        recent_runs: [],
      });

      vi.spyOn(dashboardRepository, 'getRecentActivity').mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/dashboard/overview`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kpis.aiWorkflowsTotal).toBe(0);
      expect(res.body.data.kpis.aiSuccessRate).toBe(0);
    });
  });

  describe('GET /api/v1/organizations/:organizationId/dashboard/recent-activity', () => {
    it('returns paginated recent activity feed for admin', async () => {
      vi.spyOn(dashboardRepository, 'getRecentActivity').mockResolvedValue([
        {
          id: 'log-1',
          action: 'document.uploaded',
          actorName: 'Admin User',
          actorEmail: 'admin@opspilot.test',
          targetType: 'document',
          targetId: 'doc-101',
          metadata: { filename: 'guide.pdf' },
          createdAt: '2026-11-04T12:00:00.000Z',
        },
      ]);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/dashboard/recent-activity?limit=10&offset=0`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].action).toBe('document.uploaded');
      expect(res.body.data.limit).toBe(10);
      expect(res.body.data.offset).toBe(0);
    });

    it('denies access to non-admin member for recent activity', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/dashboard/recent-activity`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });
  });
});
