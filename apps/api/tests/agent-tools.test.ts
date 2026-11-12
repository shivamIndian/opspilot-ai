import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { config } from '../src/config/env.js';
import { delegationTokenService } from '../src/modules/agent-tools/services/delegation-token.service.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { ticketRepository } from '../src/modules/tickets/repositories/ticket.repository.js';
import { ticketActivityRepository } from '../src/modules/tickets/repositories/ticket-activity.repository.js';
import { knowledgeRetrievalService } from '../src/modules/knowledge/services/knowledge-retrieval.service.js';

describe('OpsPilot API – AI Agent Tool Registry & Execution Framework (Module 11)', () => {
  const orgId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const userId = '11111111-1111-4111-8111-111111111111';
  const internalToken = config.AI_SERVICE_INTERNAL_TOKEN;

  const validScopes = [
    'tools:knowledge:read',
    'tools:tickets:read',
    'tools:tickets:write',
    'tools:users:read',
    'tools:history:read',
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Delegation Token Service', () => {
    it('generates and verifies a valid short-lived delegation token', () => {
      const { token, jti } = delegationTokenService.generateDelegationToken({
        userId,
        organizationId: orgId,
        requestId: 'req-12345',
        scopes: validScopes,
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const claims = delegationTokenService.verifyDelegationToken(token);
      expect(claims.sub).toBe(userId);
      expect(claims.orgId).toBe(orgId);
      expect(claims.requestId).toBe('req-12345');
      expect(claims.scopes).toEqual(validScopes);
      expect(claims.aud).toBe('opspilot:agent-tools');
      expect(claims.iss).toBe('opspilot:core-api');
      expect(claims.jti).toBe(jti);
    });

    it('rejects an invalid or tampered delegation token', () => {
      expect(() => {
        delegationTokenService.verifyDelegationToken('invalid-jwt-token');
      }).toThrow();
    });
  });

  describe('Internal Tool Gateway Authentication & Scopes Middleware', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .post('/internal/v1/agent-tools/knowledge/search')
        .send({ query: 'test' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED_SERVICE');
    });

    it('returns 401 when service token is incorrect', async () => {
      const res = await request(app)
        .post('/internal/v1/agent-tools/knowledge/search')
        .set('Authorization', 'Bearer wrong-secret-token')
        .send({ query: 'test' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_SERVICE_TOKEN');
    });

    it('returns 401 when x-delegation-token is missing', async () => {
      const res = await request(app)
        .post('/internal/v1/agent-tools/knowledge/search')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ query: 'test' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_DELEGATION_TOKEN');
    });

    it('returns 403 when user is not an active member of target organization', async () => {
      const { token } = delegationTokenService.generateDelegationToken({
        userId,
        organizationId: orgId,
        requestId: 'req-test',
        scopes: validScopes,
      });

      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(null);

      const res = await request(app)
        .post('/internal/v1/agent-tools/knowledge/search')
        .set('Authorization', `Bearer ${internalToken}`)
        .set('x-delegation-token', token)
        .send({ query: 'test' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ORGANIZATION_MISMATCH');
    });

    it('returns 403 when required tool scope is missing in delegation token', async () => {
      const { token } = delegationTokenService.generateDelegationToken({
        userId,
        organizationId: orgId,
        requestId: 'req-test',
        scopes: ['tools:knowledge:read'], // missing tools:tickets:write
      });

      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue({
        id: 'member-1',
        organization_id: orgId,
        user_id: userId,
        role: 'member',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      } as any);

      const res = await request(app)
        .post('/internal/v1/agent-tools/tickets/create-proposal')
        .set('Authorization', `Bearer ${internalToken}`)
        .set('x-delegation-token', token)
        .send({ title: 'New Ticket', description: 'Detailed issue description' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TOOL_PERMISSION_DENIED');
      expect(res.body.error.details.requiredScope).toBe('tools:tickets:write');
    });
  });

  describe('Agent Business Tool Endpoints', () => {
    let validToken: string;

    beforeEach(() => {
      const { token } = delegationTokenService.generateDelegationToken({
        userId,
        organizationId: orgId,
        requestId: 'req-test-uuid',
        scopes: validScopes,
      });
      validToken = token;

      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue({
        id: 'mem-1',
        organization_id: orgId,
        user_id: userId,
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      } as any);
    });

    it('POST /knowledge/search executes RAG search and returns passages', async () => {
      vi.spyOn(knowledgeRetrievalService, 'search').mockResolvedValue({
        organizationId: orgId,
        query: 'network setup',
        retrievalMode: 'hybrid',
        resultCount: 1,
        results: [
          {
            rank: 1,
            chunkId: 'chunk-1',
            documentId: 'doc-1',
            content: 'Configure VPN with IPSec gateway.',
            score: 0.92,
            scoreType: 'rrf',
            retrievalMethod: 'hybrid',
            citation: {
              documentId: 'doc-1',
              documentName: 'Network Guide.pdf',
              originalFilename: 'network.pdf',
              fileExtension: 'pdf',
              chunkId: 'chunk-1',
              chunkIndex: 0,
              pageStart: 2,
              pageEnd: 3,
              sectionTitle: 'VPN Configuration',
              charStart: 0,
              charEnd: 50,
            },
          },
        ],
        context: { passages: [], formattedPromptContext: '', totalTokens: 10 },
        diagnostics: {} as any,
      });

      const res = await request(app)
        .post('/internal/v1/agent-tools/knowledge/search')
        .set('Authorization', `Bearer ${internalToken}`)
        .set('x-delegation-token', validToken)
        .send({ query: 'network setup', topK: 3 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.query).toBe('network setup');
      expect(res.body.data.resultCount).toBe(1);
      expect(res.body.data.passages[0].documentName).toBe('Network Guide.pdf');
      expect(res.body.data.passages[0].content).toContain('IPSec gateway');
    });

    it('POST /tickets/get returns safe ticket details for authorized ticket', async () => {
      const ticketId = '22222222-2222-4222-8222-222222222222';
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        id: ticketId,
        organization_id: orgId,
        ticket_number: 104,
        subject: 'Database latency spike',
        description: 'Read queries taking over 2 seconds',
        status: 'open',
        priority: 'high',
        category: 'technical_support',
        created_by_user_id: userId,
        assigned_to_user_id: null,
        created_at: new Date('2026-11-04T00:00:00Z'),
        updated_at: new Date('2026-11-04T00:00:00Z'),
        resolved_at: null,
        closed_at: null,
        archived_at: null,
        creator_name: 'Dev Engineer',
        creator_email: 'dev@company.com',
        assignee_name: null,
        assignee_email: null,
      });

      const res = await request(app)
        .post('/internal/v1/agent-tools/tickets/get')
        .set('Authorization', `Bearer ${internalToken}`)
        .set('x-delegation-token', validToken)
        .send({ ticketId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticket_id).toBe(ticketId);
      expect(res.body.data.title).toBe('Database latency spike');
      expect(res.body.data.priority).toBe('high');
    });

    it('POST /tickets/create-proposal produces a validated action proposal WITHOUT mutating database', async () => {
      const createSpy = vi.spyOn(ticketRepository, 'create');

      const res = await request(app)
        .post('/internal/v1/agent-tools/tickets/create-proposal')
        .set('Authorization', `Bearer ${internalToken}`)
        .set('x-delegation-token', validToken)
        .send({
          title: 'Automated Agent Proposal: Memory Leak',
          description: 'Worker instances exceeding 95% RAM continuously',
          category: 'technical_support',
          priority: 'urgent',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.toolName).toBe('create_support_ticket');
      expect(res.body.data.executionMode).toBe('proposal_only');
      expect(res.body.data.approvalRequired).toBe(true);
      expect(res.body.data.status).toBe('awaiting_approval');
      expect(res.body.data.proposedAction.subject).toBe('Automated Agent Proposal: Memory Leak');
      expect(res.body.data.proposedAction.priority).toBe('urgent');
      expect(res.body.data.requestedBy).toBe(userId);

      // Verify ZERO database mutations took place
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('POST /tickets/update-proposal produces a validated action proposal WITHOUT mutating database', async () => {
      const ticketId = '33333333-3333-4333-8333-333333333333';
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        id: ticketId,
        organization_id: orgId,
        ticket_number: 105,
        subject: 'Original Ticket',
        description: 'Original Description',
        status: 'open',
        priority: 'medium',
        category: 'general',
        created_by_user_id: userId,
        assigned_to_user_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        resolved_at: null,
        closed_at: null,
        archived_at: null,
        creator_name: 'User',
      } as any);

      const updateSpy = vi.spyOn(ticketRepository, 'updateDetails');
      const prioritySpy = vi.spyOn(ticketRepository, 'updatePriority');

      const res = await request(app)
        .post('/internal/v1/agent-tools/tickets/update-proposal')
        .set('Authorization', `Bearer ${internalToken}`)
        .set('x-delegation-token', validToken)
        .send({
          ticketId,
          changes: {
            priority: 'urgent',
            status: 'in_progress',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.toolName).toBe('update_support_ticket');
      expect(res.body.data.status).toBe('awaiting_approval');
      expect(res.body.data.proposedAction.ticketId).toBe(ticketId);
      expect(res.body.data.proposedAction.changes).toEqual({
        priority: 'urgent',
        status: 'in_progress',
      });

      // Verify ZERO database mutations took place
      expect(updateSpy).not.toHaveBeenCalled();
      expect(prioritySpy).not.toHaveBeenCalled();
    });

    it('POST /users/search returns sanitized member summaries without sensitive fields', async () => {
      vi.spyOn(memberRepository, 'listByOrganization').mockResolvedValue([
        {
          membershipId: 'mem-1',
          userId: 'usr-1',
          name: 'Alice Smith',
          email: 'alice@example.com',
          role: 'admin',
          status: 'active',
          joinedAt: new Date(),
        },
        {
          membershipId: 'mem-2',
          userId: 'usr-2',
          name: 'Bob Jones',
          email: 'bob@example.com',
          role: 'member',
          status: 'active',
          joinedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .post('/internal/v1/agent-tools/users/search')
        .set('Authorization', `Bearer ${internalToken}`)
        .set('x-delegation-token', validToken)
        .send({ query: 'Alice', limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalFound).toBe(2);

      const user1 = res.body.data.users[0];
      expect(user1.userId).toBe('usr-1');
      expect(user1.name).toBe('Alice Smith');
      expect(user1.role).toBe('admin');
      expect(user1.status).toBe('active');
      // Verify passwords and tokens are never returned
      expect(user1.password).toBeUndefined();
      expect(user1.password_hash).toBeUndefined();
      expect(user1.token).toBeUndefined();
    });

    it('POST /support-history/search returns historical activity summaries', async () => {
      const ticketId = '44444444-4444-4444-8444-444444444444';
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        id: ticketId,
        organization_id: orgId,
        created_by_user_id: userId,
      } as any);

      vi.spyOn(ticketActivityRepository, 'listByTicket').mockResolvedValue({
        total: 1,
        logs: [
          {
            id: 'act-1',
            organization_id: orgId,
            ticket_id: ticketId,
            actor_user_id: userId,
            action: 'priority_updated',
            old_values: { priority: 'low' },
            new_values: { priority: 'high' },
            metadata: {},
            created_at: new Date('2026-11-04T01:00:00Z'),
            actor_name: 'Lead Admin',
            actor_email: 'admin@corp.com',
          },
        ],
      });

      const res = await request(app)
        .post('/internal/v1/agent-tools/support-history/search')
        .set('Authorization', `Bearer ${internalToken}`)
        .set('x-delegation-token', validToken)
        .send({ ticketId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRecords).toBe(1);
      expect(res.body.data.records[0].activityType).toBe('priority_updated');
      expect(res.body.data.records[0].summary).toContain('Lead Admin');
    });
  });
});
