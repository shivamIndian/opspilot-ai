import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { config } from '../src/config/env.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { agentApprovalRepository } from '../src/modules/agent-approvals/repositories/agent-approval.repository.js';
import { TicketService } from '../src/modules/tickets/services/ticket.service.js';
import { agentApprovalOutboxWorker } from '../src/workers/agent-approval-outbox.worker.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';
import type {
  AgentActionProposalEntity,
  AgentActionApprovalEntity,
  AgentActionExecutionEntity,
  AgentWorkflowOutboxEntity,
} from '../src/modules/agent-approvals/types/agent-approvals.types.js';

describe('OpsPilot API – Human-in-the-Loop Approval & Workflow Resumption (Module 14)', () => {
  const orgId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const requesterId = '11111111-1111-4111-8111-111111111111';
  const approverAdminId = '22222222-2222-4222-8222-222222222222';
  const memberOnlyId = '33333333-3333-4333-8333-333333333333';
  const internalToken = config.AI_SERVICE_INTERNAL_TOKEN;

  const requesterUser: UserEntity = {
    id: requesterId,
    name: 'Requester Engineer',
    email: 'requester@example.com',
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

  const approverAdminUser: UserEntity = {
    id: approverAdminId,
    name: 'Admin Approver',
    email: 'admin@example.com',
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

  const memberOnlyUser: UserEntity = {
    id: memberOnlyId,
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

  const org: OrganizationEntity = {
    id: orgId,
    name: 'OpsPilot Enterprise Org',
    slug: 'opspilot-enterprise',
    description: 'Enterprise organization for testing approvals',
    logo_url: null,
    status: 'active',
    created_by_user_id: approverAdminId,
    created_at: new Date(),
    updated_at: new Date(),
    archived_at: null,
  };

  const requesterMember: OrganizationMemberEntity = {
    id: 'mem-1',
    organization_id: orgId,
    user_id: requesterId,
    role: 'admin',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const approverAdminMember: OrganizationMemberEntity = {
    id: 'mem-2',
    organization_id: orgId,
    user_id: approverAdminId,
    role: 'admin',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const standardMember: OrganizationMemberEntity = {
    id: 'mem-3',
    organization_id: orgId,
    user_id: memberOnlyId,
    role: 'member',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const getJwt = (user: UserEntity) =>
    tokenService.generateAccessToken(user.id, user.platform_role).token;

  let requesterToken: string;
  let adminToken: string;
  let memberToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();

    requesterToken = getJwt(requesterUser);
    adminToken = getJwt(approverAdminUser);
    memberToken = getJwt(memberOnlyUser);

    vi.spyOn(organizationRepository, 'findById').mockResolvedValue(org);

    vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(
      async (oId: string, uId: string) => {
        if (oId !== orgId) return null;
        if (uId === requesterId) return requesterMember;
        if (uId === approverAdminId) return approverAdminMember;
        if (uId === memberOnlyId) return standardMember;
        return null;
      }
    );
  });

  describe('Maker-Checker Security Policy Enforcement', () => {
    const highRiskProposal: AgentActionProposalEntity = {
      id: 'prop-high-1',
      organization_id: orgId,
      run_id: 'run-101',
      thread_id: 'thread-101',
      requested_by: requesterId,
      action_type: 'update_support_ticket',
      tool_name: 'update_support_ticket',
      risk_level: 'high',
      proposal_payload: {
        ticket_id: 'tick-101',
        status: 'closed',
        comment: 'Auto-closed after incident mitigation',
      },
      status: 'awaiting_approval',
      justification: 'Closing customer ticket following service restoration',
      policy_snapshot: { rule: 'high_risk_closure' },
      expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('rejects self-approval with 403 MAKER_CHECKER_VIOLATION when requester attempts to approve HIGH-risk proposal', async () => {
      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal: highRiskProposal,
        approval: null,
        execution: null,
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/agent/approvals/${highRiskProposal.id}/approve`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ notes: 'Self-approving my own ticket closure' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MAKER_CHECKER_VIOLATION');
      expect(res.body.error.message).toContain('Self-approval is forbidden');
    });

    it('rejects approval with 403 when standard member lacks agent:approve permission', async () => {
      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal: highRiskProposal,
        approval: null,
        execution: null,
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/agent/approvals/${highRiskProposal.id}/approve`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ notes: 'Trying to approve as regular member' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_ORGANIZATION_PERMISSIONS');
    });

    it('allows an independent admin to approve HIGH-risk proposal and creates approval & outbox records', async () => {
      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal: highRiskProposal,
        approval: null,
        execution: null,
      });

      const mockApprovalEntity: AgentActionApprovalEntity = {
        id: 'appr-1',
        proposal_id: highRiskProposal.id,
        organization_id: orgId,
        decision: 'approved',
        decided_by: approverAdminId,
        decision_reason: 'Verified incident post-mortem with SRE lead',
        decided_at: new Date(),
      };

      const mockUpdatedProposal: AgentActionProposalEntity = {
        ...highRiskProposal,
        status: 'approved',
      };

      vi.spyOn(agentApprovalRepository, 'recordDecision').mockResolvedValue({
        proposal: mockUpdatedProposal,
        approval: mockApprovalEntity,
        outbox: {
          id: 'outbox-1',
          proposal_id: highRiskProposal.id,
          organization_id: orgId,
          event_type: 'PROPOSAL_APPROVED',
          payload: { proposalId: highRiskProposal.id },
          status: 'pending',
          retry_count: 0,
          max_retries: 5,
          next_retry_at: new Date(),
          processed_at: null,
          last_error: null,
          created_at: new Date(),
        },
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/agent/approvals/${highRiskProposal.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Verified incident post-mortem with SRE lead' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.approval.decision).toBe('approved');
      expect(res.body.data.approval.decidedBy).toBe(approverAdminId);
    });

    it('permits self-approval on LOW-risk proposal when ALLOW_SELF_APPROVAL allows low/medium risk', async () => {
      const lowRiskProposal: AgentActionProposalEntity = {
        ...highRiskProposal,
        id: 'prop-low-1',
        risk_level: 'low',
        action_type: 'tag_ticket',
      };

      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal: lowRiskProposal,
        approval: null,
        execution: null,
      });

      vi.spyOn(agentApprovalRepository, 'recordDecision').mockResolvedValue({
        proposal: { ...lowRiskProposal, status: 'approved' },
        approval: {
          id: 'appr-low-1',
          proposal_id: lowRiskProposal.id,
          organization_id: orgId,
          decision: 'approved',
          decided_by: requesterId,
          decision_reason: null,
          decided_at: new Date(),
        },
        outbox: {} as any,
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/agent/approvals/${lowRiskProposal.id}/approve`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
    });
  });

  describe('Proposal Rejection & Cancellation Lifecycle', () => {
    const proposal: AgentActionProposalEntity = {
      id: 'prop-to-reject-1',
      organization_id: orgId,
      run_id: 'run-102',
      thread_id: 'thread-102',
      requested_by: requesterId,
      action_type: 'create_support_ticket',
      tool_name: 'create_support_ticket',
      risk_level: 'medium',
      proposal_payload: {
        title: 'Customer billing dispute',
        priority: 'high',
      },
      status: 'awaiting_approval',
      justification: 'Automated ticket creation proposal',
      policy_snapshot: null,
      expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('requires a mandatory non-empty reason when rejecting a proposal', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/agent/approvals/${proposal.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('records rejection decision with outbox event and updates status to rejected', async () => {
      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal,
        approval: null,
        execution: null,
      });

      vi.spyOn(agentApprovalRepository, 'recordDecision').mockResolvedValue({
        proposal: { ...proposal, status: 'rejected' },
        approval: {
          id: 'appr-rej-1',
          proposal_id: proposal.id,
          organization_id: orgId,
          decision: 'rejected',
          decided_by: approverAdminId,
          decision_reason: 'Duplicate ticket already exists in billing queue',
          decided_at: new Date(),
        },
        outbox: {
          id: 'outbox-rej-1',
          proposal_id: proposal.id,
          organization_id: orgId,
          event_type: 'PROPOSAL_REJECTED',
          payload: { reason: 'Duplicate ticket' },
          status: 'pending',
          retry_count: 0,
          max_retries: 5,
          next_retry_at: new Date(),
          processed_at: null,
          last_error: null,
          created_at: new Date(),
        },
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/agent/approvals/${proposal.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Duplicate ticket already exists in billing queue' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('rejected');
      expect(res.body.data.approval.decision).toBe('rejected');
    });

    it('prevents decision when proposal is already approved or rejected (409 Conflict)', async () => {
      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal: { ...proposal, status: 'approved' },
        approval: {
          id: 'appr-prev',
          proposal_id: proposal.id,
          organization_id: orgId,
          decision: 'approved',
          decided_by: approverAdminId,
          decision_reason: 'Already approved',
          decided_at: new Date(),
        },
        execution: null,
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/agent/approvals/${proposal.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Attempting second approval' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PROPOSAL_STATE_CONFLICT');
    });

    it('allows requester to cancel their own pending proposal', async () => {
      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal,
        approval: null,
        execution: null,
      });

      vi.spyOn(agentApprovalRepository, 'cancelProposal').mockResolvedValue({
        ...proposal,
        status: 'cancelled',
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/agent/approvals/${proposal.id}/cancel`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ reason: 'No longer needed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('forbids cancellation of proposal by a non-requester non-admin', async () => {
      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal,
        approval: null,
        execution: null,
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/agent/approvals/${proposal.id}/cancel`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ reason: 'Unauthorized cancellation attempt' });

      expect(res.status).toBe(403);
    });
  });

  describe('Querying Proposals & Audit Details', () => {
    it('returns filtered proposal list with pagination', async () => {
      vi.spyOn(agentApprovalRepository, 'listProposals').mockResolvedValue({
        items: [
          {
            id: 'p-1',
            organization_id: orgId,
            run_id: 'r-1',
            thread_id: 't-1',
            requested_by: requesterId,
            action_type: 'create_support_ticket',
            tool_name: 'create_support_ticket',
            risk_level: 'medium',
            proposal_payload: { title: 'Ticket 1' },
            status: 'awaiting_approval',
            justification: 'Automated workflow step',
            policy_snapshot: null,
            expires_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        total: 1,
      });

      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/agent/approvals?status=awaiting_approval&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it('returns full proposal audit record including approval and execution info', async () => {
      const p: AgentActionProposalEntity = {
        id: 'prop-details-1',
        organization_id: orgId,
        run_id: 'r-1',
        thread_id: 't-1',
        requested_by: requesterId,
        action_type: 'create_support_ticket',
        tool_name: 'create_support_ticket',
        risk_level: 'medium',
        proposal_payload: { title: 'Test Ticket' },
        status: 'executed',
        justification: 'Ticket creation workflow',
        policy_snapshot: null,
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const appr: AgentActionApprovalEntity = {
        id: 'appr-1',
        proposal_id: p.id,
        organization_id: orgId,
        decision: 'approved',
        decided_by: approverAdminId,
        decision_reason: 'Approved for execution',
        decided_at: new Date(),
      };

      const exec: AgentActionExecutionEntity = {
        id: 'exec-1',
        proposal_id: p.id,
        organization_id: orgId,
        executed_by: requesterId,
        execution_status: 'success',
        target_entity_type: 'ticket',
        target_entity_id: 't-12345',
        execution_result: { ticket_id: 't-12345', title: 'Test Ticket' },
        error_details: null,
        idempotency_key: 'exec-key-1',
        started_at: new Date(),
        completed_at: new Date(),
      };

      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal: p,
        approval: appr,
        execution: exec,
      });

      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/agent/approvals/${p.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(p.id);
      expect(res.body.data.status).toBe('executed');
      expect(res.body.data.approval.decision).toBe('approved');
      expect(res.body.data.execution.executionStatus).toBe('success');
      expect(res.body.data.execution.targetEntityId).toBe('t-12345');
    });

    it('returns 404 when proposal ID does not exist', async () => {
      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/agent/approvals/non-existent-id`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Internal Execution Gateway & Idempotency', () => {
    const approvedProposal: AgentActionProposalEntity = {
      id: 'prop-exec-1',
      organization_id: orgId,
      run_id: 'run-999',
      thread_id: 'thread-999',
      requested_by: requesterId,
      action_type: 'create_support_ticket',
      tool_name: 'create_support_ticket',
      risk_level: 'medium',
      proposal_payload: {
        title: 'Network outage in US-East',
        description: 'Automated alert investigation found packet loss',
        priority: 'high',
        department: 'infrastructure',
      },
      status: 'approved',
      justification: 'Automated ticket creation after diagnostics',
      policy_snapshot: null,
      expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('rejects execution request with 401 when internal service token is missing or invalid', async () => {
      const res = await request(app)
        .post(`/internal/v1/agent-proposals/${approvedProposal.id}/execute`)
        .send({ organizationId: orgId });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED_SERVICE');
    });

    it('executes create_support_ticket via TicketService and records execution success', async () => {
      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal: approvedProposal,
        approval: {
          id: 'appr-exec',
          proposal_id: approvedProposal.id,
          organization_id: orgId,
          decision: 'approved',
          decided_by: approverAdminId,
          decision_reason: 'Approved',
          decided_at: new Date(),
        },
        execution: null,
      });

      const mockCreatedExecution: AgentActionExecutionEntity = {
        id: 'exec-rec-1',
        proposal_id: approvedProposal.id,
        organization_id: orgId,
        executed_by: requesterId,
        execution_status: 'pending',
        target_entity_type: 'ticket',
        target_entity_id: null,
        execution_result: null,
        error_details: null,
        idempotency_key: `exec-${approvedProposal.id}`,
        started_at: new Date(),
        completed_at: null,
      };

      vi.spyOn(agentApprovalRepository, 'createExecution').mockResolvedValue(mockCreatedExecution);

      const mockTicket = {
        id: 'new-ticket-uuid',
        organization_id: orgId,
        ticket_number: 1042,
        ticketNumber: 1042,
        subject: 'Network outage in US-East',
        description: 'Automated alert investigation found packet loss',
        priority: 'high',
        status: 'open',
        category: 'technical_support',
        created_by_user_id: requesterId,
        assigned_to_user_id: null,
        custom_fields: {},
        tags: ['agent-created'],
        is_escalated: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.spyOn(TicketService.prototype, 'createTicket').mockResolvedValue(mockTicket as any);

      vi.spyOn(agentApprovalRepository, 'updateExecutionOutcome').mockResolvedValue({
        ...mockCreatedExecution,
        execution_status: 'success',
        target_entity_id: mockTicket.id,
        execution_result: {
          ticket_id: mockTicket.id,
          ticket_number: 1042,
        ticketNumber: 1042,
          subject: mockTicket.subject,
          status: 'open',
          priority: 'high',
        },
        completed_at: new Date(),
      });

      const res = await request(app)
        .post(`/internal/v1/agent-proposals/${approvedProposal.id}/execute`)
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ organizationId: orgId, idempotencyKey: `exec-${approvedProposal.id}` });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.executionStatus).toBe('success');
      expect(res.body.data.targetEntityId).toBe('new-ticket-uuid');
    });

    it('returns cached execution without re-invoking business service when already executed (idempotency)', async () => {
      const alreadyExecuted: AgentActionExecutionEntity = {
        id: 'exec-cached-1',
        proposal_id: approvedProposal.id,
        organization_id: orgId,
        executed_by: requesterId,
        execution_status: 'success',
        target_entity_type: 'ticket',
        target_entity_id: 'existing-ticket-id',
        execution_result: { ticket_id: 'existing-ticket-id', ticket_number: 1042 },
        error_details: null,
        idempotency_key: `exec-${approvedProposal.id}`,
        started_at: new Date(),
        completed_at: new Date(),
      };

      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal: { ...approvedProposal, status: 'executed' },
        approval: null,
        execution: alreadyExecuted,
      });

      const ticketCreateSpy = vi.spyOn(TicketService.prototype, 'createTicket');

      const res = await request(app)
        .post(`/internal/v1/agent-proposals/${approvedProposal.id}/execute`)
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ organizationId: orgId, idempotencyKey: `exec-${approvedProposal.id}` });

      expect(res.status).toBe(200);
      expect(res.body.data.executionStatus).toBe('success');
      expect(res.body.data.targetEntityId).toBe('existing-ticket-id');
      expect(ticketCreateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Durable Outbox Worker Batch Processing', () => {
    it('processes pending approved event by executing proposal and notifying AI service', async () => {
      const pendingOutboxItem: AgentWorkflowOutboxEntity = {
        id: 'outbox-pending-1',
        proposal_id: 'prop-exec-1',
        organization_id: orgId,
        event_type: 'PROPOSAL_APPROVED',
        payload: {
          proposalId: 'prop-exec-1',
          organizationId: orgId,
          threadId: 'thread-999',
          decision: 'approved',
          decidedBy: approverAdminId,
          decisionReason: 'Approved',
        },
        status: 'pending',
        retry_count: 0,
        max_retries: 5,
        next_retry_at: new Date(),
        processed_at: null,
        last_error: null,
        created_at: new Date(),
      };

      vi.spyOn(agentApprovalRepository, 'fetchPendingOutboxEvents').mockResolvedValue([
        pendingOutboxItem,
      ]);

      const markCompletedSpy = vi
        .spyOn(agentApprovalRepository, 'markOutboxEventCompleted')
        .mockResolvedValue(undefined);

      vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
        proposal: {
          id: 'prop-exec-1',
          organization_id: orgId,
          run_id: 'run-999',
          thread_id: 'thread-999',
          requested_by: requesterId,
          action_type: 'create_support_ticket',
          tool_name: 'create_support_ticket',
          risk_level: 'medium',
          proposal_payload: { title: 'Outage Ticket' },
          status: 'approved',
          justification: 'Automated ticket creation',
          policy_snapshot: null,
          expires_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        approval: {
          id: 'appr-1',
          proposal_id: 'prop-exec-1',
          organization_id: orgId,
          decision: 'approved',
          decided_by: approverAdminId,
          decision_reason: 'Approved',
          decided_at: new Date(),
        },
        execution: {
          id: 'exec-1',
          proposal_id: 'prop-exec-1',
          organization_id: orgId,
          executed_by: requesterId,
          execution_status: 'success',
          target_entity_type: 'ticket',
          target_entity_id: 'ticket-1',
          execution_result: { ticket_id: 'ticket-1' },
          error_details: null,
          idempotency_key: 'exec-prop-exec-1',
          started_at: new Date(),
          completed_at: new Date(),
        },
      });

      // Mock fetch call to AI service resume endpoint
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as any);

      const processedCount = await agentApprovalOutboxWorker.processBatch(10);

      expect(processedCount).toBe(1);
      expect(markCompletedSpy).toHaveBeenCalledWith(pendingOutboxItem.id);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/internal/v1/agent/workflows/resume'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-internal-service-token': expect.any(String),
          }),
        })
      );
    });
  });
});
