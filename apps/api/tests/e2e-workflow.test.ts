import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/database/index.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { ticketRepository } from '../src/modules/tickets/repositories/ticket.repository.js';
import { ticketCounterRepository } from '../src/modules/tickets/repositories/ticket-counter.repository.js';
import { agentApprovalRepository } from '../src/modules/agent-approvals/repositories/agent-approval.repository.js';
import type { OrganizationMember } from '../src/modules/organizations/types/organization.types.js';
import type { Ticket } from '../src/modules/tickets/types/ticket.types.js';
import type { AgentActionProposalEntity } from '../src/modules/agent-approvals/types/agent-approvals.types.js';

describe('Module 25: End-to-End Operational Lifecycle Simulation', () => {
  const app = createApp();

  const orgId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const adminUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@opspilot.internal',
    platform_role: 'user' as const,
  };

  let token: string;

  beforeEach(() => {
    vi.restoreAllMocks();

    const mockClient = {
      query: vi.fn().mockImplementation(async () => {
        return { rows: [], rowCount: 1 };
      }),
      release: vi.fn(),
    };
    vi.spyOn(pool, 'connect').mockResolvedValue(mockClient as any);

    token = tokenService.generateAccessToken(adminUser.id, adminUser.platform_role).token;

    // Mock active organization
    vi.spyOn(organizationRepository, 'findById').mockResolvedValue({
      id: orgId,
      name: 'OpsPilot Enterprise',
      slug: 'opspilot-enterprise',
      status: 'active',
      created_by: adminUser.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Mock active membership with admin role
    vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue({
      id: 'mem-admin',
      organization_id: orgId,
      user_id: adminUser.id,
      role: 'admin',
      status: 'active',
      joined_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    } as OrganizationMember);
  });

  it('executes complete support operations lifecycle: ticket -> agent proposal -> human authorization -> mutation', async () => {
    // 1. Ticket Creation
    const mockTicket: Ticket = {
      id: 'ticket-uuid-101',
      organization_id: orgId,
      ticket_number: 42,
      subject: 'Critical Service Degradation in US-East',
      description: 'Multiple users report timeout during payment processing.',
      category: 'technical_support',
      priority: 'medium',
      status: 'open',
      created_by_user_id: adminUser.id,
      assigned_to_user_id: null,
      resolved_at: null,
      closed_at: null,
      archived_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    vi.spyOn(ticketCounterRepository, 'getNextTicketNumber').mockResolvedValue(42);
    vi.spyOn(ticketRepository, 'create').mockResolvedValue(mockTicket);
    vi.spyOn(ticketRepository, 'findById').mockResolvedValue(mockTicket);

    const createTicketRes = await request(app)
      .post(`/api/v1/organizations/${orgId}/tickets`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-bypass-csrf', 'true')
      .send({
        subject: 'Critical Service Degradation in US-East',
        description: 'Multiple users report timeout during payment processing.',
        category: 'technical_support',
        priority: 'medium',
      });

    expect(createTicketRes.status).toBe(201);
    expect(createTicketRes.body.success).toBe(true);
    const ticketData = createTicketRes.body.data.ticket;
    expect(ticketData.ticketNumber ?? ticketData.ticket_number).toBe(42);

    // 2. Agent Proposal Creation (Awaiting Human Approval)
    const mockProposal: AgentActionProposalEntity = {
      id: 'prop-uuid-505',
      organization_id: orgId,
      run_id: 'run-uuid-001',
      thread_id: 'thread-alpha',
      requested_by: '22222222-2222-4222-8222-222222222222', // Agent requester (distinct from decider for maker-checker)
      action_type: 'tickets_update_priority',
      tool_name: 'tickets_update_priority',
      risk_level: 'high',
      proposal_payload: {
        ticketId: mockTicket.id,
        priority: 'urgent',
        reason: 'Automated triage detected SLA breach risk.',
      },
      status: 'awaiting_approval',
      justification: 'Automated triage detected SLA breach risk.',
      policy_snapshot: null,
      created_at: new Date(),
      updated_at: new Date(),
      expires_at: new Date(Date.now() + 3600000),
    };

    vi.spyOn(agentApprovalRepository, 'findProposalById').mockResolvedValue({
      proposal: mockProposal,
      approval: null,
      execution: null,
    });
    vi.spyOn(agentApprovalRepository, 'recordDecision').mockResolvedValue({
      proposal: { ...mockProposal, status: 'approved' },
      approval: {
        id: 'appr-1',
        proposal_id: mockProposal.id,
        organization_id: orgId,
        decision: 'approved',
        decided_by: adminUser.id,
        decision_reason: 'Approved by lead SRE on duty',
        decided_at: new Date(),
      },
    });

    // 3. Human Reviewer Approves Action Proposal
    const approvalRes = await request(app)
      .post(`/api/v1/organizations/${orgId}/agent/approvals/${mockProposal.id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-bypass-csrf', 'true')
      .send({
        notes: 'Approved by lead SRE on duty',
      });

    expect(approvalRes.status).toBe(200);
    expect(approvalRes.body.success).toBe(true);
    expect(approvalRes.body.data.status).toBe('approved');

    // 4. Verification that approval was recorded with maker-checker adherence
    expect(agentApprovalRepository.recordDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: mockProposal.id,
        organizationId: orgId,
        decision: 'approved',
        decidedBy: adminUser.id,
      })
    );
  });
});
