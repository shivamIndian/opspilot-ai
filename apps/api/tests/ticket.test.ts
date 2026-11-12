import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/index.js';
import { ticketRepository } from '../src/modules/tickets/repositories/ticket.repository.js';
import { ticketCounterRepository } from '../src/modules/tickets/repositories/ticket-counter.repository.js';
import { ticketCommentRepository } from '../src/modules/tickets/repositories/ticket-comment.repository.js';
import { ticketActivityRepository } from '../src/modules/tickets/repositories/ticket-activity.repository.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import type {
  TicketWithUsersEntity,
  TicketEntity,
  TicketCommentWithAuthorEntity,
} from '../src/modules/tickets/types/ticket.types.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';

describe('OpsPilot API – Support Ticket Management & Workflow Module 05', () => {
  // Test Users
  const userA: UserEntity = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Alice Owner',
    email: 'alice@example.com',
    password_hash: 'hashA',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const userB: UserEntity = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Bob Admin',
    email: 'bob@example.com',
    password_hash: 'hashB',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const userC: UserEntity = {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Charlie Member',
    email: 'charlie@example.com',
    password_hash: 'hashC',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const userD: UserEntity = {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'David Foreign',
    email: 'david@example.com',
    password_hash: 'hashD',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Organizations
  const orgA: OrganizationEntity = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Acme Corp',
    slug: 'acme-corp',
    description: 'First org',
    logo_url: null,
    status: 'active',
    created_by: userA.id,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const orgB: OrganizationEntity = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Beta Global',
    slug: 'beta-global',
    description: 'Second org',
    logo_url: null,
    status: 'active',
    created_by: userD.id,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Memberships
  const memberAliceInA: OrganizationMemberEntity = {
    id: '55555555-5555-4555-8555-555555555551',
    organization_id: orgA.id,
    user_id: userA.id,
    role: 'owner',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberBobInA: OrganizationMemberEntity = {
    id: '55555555-5555-4555-8555-555555555552',
    organization_id: orgA.id,
    user_id: userB.id,
    role: 'admin',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberCharlieInA: OrganizationMemberEntity = {
    id: '55555555-5555-4555-8555-555555555553',
    organization_id: orgA.id,
    user_id: userC.id,
    role: 'member',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberDavidInB: OrganizationMemberEntity = {
    id: '55555555-5555-4555-8555-555555555554',
    organization_id: orgB.id,
    user_id: userD.id,
    role: 'owner',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Sample Tickets
  const mockTicket1: TicketWithUsersEntity = {
    id: '77777777-7777-4777-8777-777777777771',
    organization_id: orgA.id,
    ticket_number: 1,
    subject: 'Cannot login to billing portal',
    description: 'User gets 500 internal server error upon submit.',
    category: 'billing',
    priority: 'high',
    status: 'open',
    created_by_user_id: userC.id,
    assigned_to_user_id: null,
    resolved_at: null,
    closed_at: null,
    archived_at: null,
    created_at: new Date('2026-11-03T10:00:00Z'),
    updated_at: new Date('2026-11-03T10:00:00Z'),
    creator_name: userC.name,
    creator_email: userC.email,
    assignee_name: null,
    assignee_email: null,
  };

  const mockTicket2: TicketWithUsersEntity = {
    id: '77777777-7777-4777-8777-777777777772',
    organization_id: orgA.id,
    ticket_number: 2,
    subject: 'Feature request: dark mode',
    description: 'Please add a toggle for dark mode in settings.',
    category: 'feature_request',
    priority: 'low',
    status: 'in_progress',
    created_by_user_id: userA.id,
    assigned_to_user_id: userC.id,
    resolved_at: null,
    closed_at: null,
    archived_at: null,
    created_at: new Date('2026-11-03T11:00:00Z'),
    updated_at: new Date('2026-11-03T11:00:00Z'),
    creator_name: userA.name,
    creator_email: userA.email,
    assignee_name: userC.name,
    assignee_email: userC.email,
  };

  const mockTicketInB: TicketWithUsersEntity = {
    id: '77777777-7777-4777-8777-777777777779',
    organization_id: orgB.id,
    ticket_number: 1,
    subject: 'Org B Secret Ticket',
    description: 'This is completely confidential to Org B.',
    category: 'general',
    priority: 'medium',
    status: 'open',
    created_by_user_id: userD.id,
    assigned_to_user_id: null,
    resolved_at: null,
    closed_at: null,
    archived_at: null,
    created_at: new Date('2026-11-03T12:00:00Z'),
    updated_at: new Date('2026-11-03T12:00:00Z'),
    creator_name: userD.name,
    creator_email: userD.email,
  };

  const getJwt = (user: UserEntity) =>
    tokenService.generateAccessToken(user.id, user.platform_role).token;

  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock Pool client for transaction methods
    const mockClient = {
      query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    vi.spyOn(pool, 'connect').mockResolvedValue(mockClient as any);

    // Default Org & Member Mocks
    vi.spyOn(organizationRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === orgA.id) return orgA;
      if (id === orgB.id) return orgB;
      return null;
    });

    vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(
      async (orgId: string, userId: string) => {
        if (orgId === orgA.id) {
          if (userId === userA.id) return memberAliceInA;
          if (userId === userB.id) return memberBobInA;
          if (userId === userC.id) return memberCharlieInA;
        }
        if (orgId === orgB.id) {
          if (userId === userD.id) return memberDavidInB;
        }
        return null;
      }
    );

    // Default Activity Mock
    vi.spyOn(ticketActivityRepository, 'logActivity').mockResolvedValue({
      id: 'act-1',
      organization_id: orgA.id,
      ticket_id: mockTicket1.id,
      actor_user_id: userA.id,
      action: 'ticket.created',
      old_values: null,
      new_values: null,
      metadata: {},
      created_at: new Date(),
    });
  });

  // ==========================================
  // 1. TICKET CREATION & NUMBERING
  // ==========================================
  describe('1. Ticket Creation & Sequential Numbering', () => {
    it('should create a ticket with sequential number and default medium priority', async () => {
      vi.spyOn(ticketCounterRepository, 'getNextTicketNumber').mockResolvedValue(1);
      vi.spyOn(ticketRepository, 'create').mockResolvedValue({
        id: mockTicket1.id,
        organization_id: orgA.id,
        ticket_number: 1,
        subject: 'Cannot login to billing portal',
        description: 'User gets 500 internal server error upon submit.',
        category: 'billing',
        priority: 'medium',
        status: 'open',
        created_by_user_id: userC.id,
        assigned_to_user_id: null,
        resolved_at: null,
        closed_at: null,
        archived_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      vi.spyOn(ticketRepository, 'findById').mockResolvedValue(mockTicket1);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({
          subject: 'Cannot login to billing portal',
          description: 'User gets 500 internal server error upon submit.',
          category: 'billing',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticket.ticketNumber).toBe(1);
      expect(res.body.data.ticket.formattedTicketNumber).toBe('TKT-000001');
      expect(res.body.data.ticket.status).toBe('open');
      expect(res.body.data.ticket.createdByUserId).toBe(userC.id);
    });

    it('should allow admin to specify high or urgent priority on creation', async () => {
      vi.spyOn(ticketCounterRepository, 'getNextTicketNumber').mockResolvedValue(2);
      vi.spyOn(ticketRepository, 'create').mockResolvedValue({
        ...mockTicket1,
        ticket_number: 2,
        priority: 'urgent',
      });
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        ...mockTicket1,
        ticket_number: 2,
        priority: 'urgent',
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets`)
        .set('Authorization', `Bearer ${getJwt(userB)}`)
        .send({
          subject: 'Production outage in EU cluster',
          description: 'All services down in frankfurt region.',
          category: 'technical_support',
          priority: 'urgent',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ticket.priority).toBe('urgent');
    });

    it('should reject unauthenticated creation with 401', async () => {
      const res = await request(app).post(`/api/v1/organizations/${orgA.id}/tickets`).send({
        subject: 'Hacker ticket',
        description: 'Unauthenticated attempt',
        category: 'general',
      });

      expect(res.status).toBe(401);
    });

    it('should reject non-member creation with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets`)
        .set('Authorization', `Bearer ${getJwt(userD)}`) // User D belongs to Org B only
        .send({
          subject: 'Intruder ticket',
          description: 'Should be rejected',
          category: 'general',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('should reject invalid input (< 3 char subject, invalid category) with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({
          subject: 'ab',
          description: 'Valid description here',
          category: 'non_existent_category',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================
  // 2. TICKET LISTING, FILTERS & ROLE VISIBILITY
  // ==========================================
  describe('2. Ticket Listing & Role-Based Visibility', () => {
    it('should return all tickets for organization owner/admin', async () => {
      vi.spyOn(ticketRepository, 'list').mockResolvedValue({
        total: 2,
        tickets: [mockTicket1, mockTicket2],
      });

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/tickets`)
        .set('Authorization', `Bearer ${getJwt(userA)}`); // Alice is owner

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tickets.length).toBe(2);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('should enforce role-scoped visibility for standard member (created or assigned only)', async () => {
      // Mock repository call receives actorRole='member' and actorUserId=userC.id
      vi.spyOn(ticketRepository, 'list').mockImplementation(
        async (_orgId, _params, role, userId) => {
          expect(role).toBe('member');
          expect(userId).toBe(userC.id);
          return {
            total: 2,
            tickets: [mockTicket1, mockTicket2], // Charlie created ticket1 and is assigned to ticket2
          };
        }
      );

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/tickets`)
        .set('Authorization', `Bearer ${getJwt(userC)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tickets.length).toBe(2);
    });

    it('should return summary metrics scoped to caller visibility', async () => {
      vi.spyOn(ticketRepository, 'getSummaryMetrics').mockResolvedValue({
        total: 10,
        open: 4,
        inProgress: 3,
        waitingOnCustomer: 1,
        resolved: 1,
        closed: 1,
        urgent: 2,
        high: 3,
      });

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/tickets/summary`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(10);
      expect(res.body.data.open).toBe(4);
      expect(res.body.data.urgent).toBe(2);
    });
  });

  // ==========================================
  // 3. TICKET DETAILS & CROSS-MEMBER PRIVACY
  // ==========================================
  describe('3. Ticket Details & Scoped Access', () => {
    it('should return ticket details for authorized creator', async () => {
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue(mockTicket1);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}`)
        .set('Authorization', `Bearer ${getJwt(userC)}`); // Charlie created ticket 1

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.id).toBe(mockTicket1.id);
      expect(res.body.data.ticket.formattedTicketNumber).toBe('TKT-000001');
    });

    it('should return 404 for member who is neither creator nor assignee of another member private ticket', async () => {
      const privateTicketOfAlice: TicketWithUsersEntity = {
        ...mockTicket1,
        id: '77777777-7777-4777-8777-777777777799',
        created_by_user_id: userA.id,
        assigned_to_user_id: userB.id, // Assigned to Bob, not Charlie
      };

      vi.spyOn(ticketRepository, 'findById').mockResolvedValue(privateTicketOfAlice);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/tickets/${privateTicketOfAlice.id}`)
        .set('Authorization', `Bearer ${getJwt(userC)}`); // Charlie has no relation

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TICKET_NOT_FOUND');
    });
  });

  // ==========================================
  // 4. TICKET ASSIGNMENT
  // ==========================================
  describe('4. Ticket Assignment & Unassignment', () => {
    it('should allow owner or admin to assign ticket to an active organization member', async () => {
      vi.spyOn(ticketRepository, 'findByIdForUpdate').mockResolvedValue(mockTicket1);
      vi.spyOn(ticketRepository, 'updateAssignment').mockResolvedValue({
        ...mockTicket1,
        assigned_to_user_id: userC.id,
      });
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        ...mockTicket1,
        assigned_to_user_id: userC.id,
        assignee_name: userC.name,
        assignee_email: userC.email,
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/assign`)
        .set('Authorization', `Bearer ${getJwt(userB)}`) // Bob is admin
        .send({ assignedToUserId: userC.id });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.assignedToUserId).toBe(userC.id);
      expect(res.body.data.ticket.assignee.name).toBe(userC.name);
    });

    it('should allow owner or admin to unassign ticket (assignedToUserId: null)', async () => {
      vi.spyOn(ticketRepository, 'findByIdForUpdate').mockResolvedValue(mockTicket2);
      vi.spyOn(ticketRepository, 'updateAssignment').mockResolvedValue({
        ...mockTicket2,
        assigned_to_user_id: null,
      });
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        ...mockTicket2,
        assigned_to_user_id: null,
        assignee_name: null,
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket2.id}/assign`)
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({ assignedToUserId: null });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.assignedToUserId).toBeNull();
    });

    it('should reject member attempting to assign tickets with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/assign`)
        .set('Authorization', `Bearer ${getJwt(userC)}`) // Charlie is standard member
        .send({ assignedToUserId: userC.id });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ASSIGNMENT');
    });

    it('should reject assigning user who is NOT a member of the organization with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/assign`)
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({ assignedToUserId: userD.id }); // User D belongs to Org B only

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ASSIGNEE_NOT_ACTIVE_MEMBER');
    });
  });

  // ==========================================
  // 5. STATUS WORKFLOW STATE MACHINE
  // ==========================================
  describe('5. Status Workflow State Machine', () => {
    it('should allow admin to transition open -> in_progress', async () => {
      vi.spyOn(ticketRepository, 'findByIdForUpdate').mockResolvedValue({
        ...mockTicket1,
        status: 'open',
      });
      vi.spyOn(ticketRepository, 'updateStatus').mockResolvedValue({
        ...mockTicket1,
        status: 'in_progress',
      });
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        ...mockTicket1,
        status: 'in_progress',
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/status`)
        .set('Authorization', `Bearer ${getJwt(userB)}`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('in_progress');
    });

    it('should allow admin to transition in_progress -> resolved and set resolved_at', async () => {
      vi.spyOn(ticketRepository, 'findByIdForUpdate').mockResolvedValue({
        ...mockTicket1,
        status: 'in_progress',
      });
      vi.spyOn(ticketRepository, 'updateStatus').mockResolvedValue({
        ...mockTicket1,
        status: 'resolved',
        resolved_at: new Date(),
      });
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        ...mockTicket1,
        status: 'resolved',
        resolved_at: new Date(),
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/status`)
        .set('Authorization', `Bearer ${getJwt(userB)}`)
        .send({ status: 'resolved' });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('resolved');
      expect(res.body.data.ticket.resolvedAt).not.toBeNull();
    });

    it('should allow ticket creator to close their own resolved ticket', async () => {
      vi.spyOn(ticketRepository, 'findByIdForUpdate').mockResolvedValue({
        ...mockTicket1,
        created_by_user_id: userC.id,
        status: 'resolved',
        resolved_at: new Date('2026-11-03T11:00:00Z'),
      });
      vi.spyOn(ticketRepository, 'updateStatus').mockResolvedValue({
        ...mockTicket1,
        status: 'closed',
        closed_at: new Date(),
      });
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        ...mockTicket1,
        status: 'closed',
        closed_at: new Date(),
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/status`)
        .set('Authorization', `Bearer ${getJwt(userC)}`) // Charlie created ticket 1
        .send({ status: 'closed' });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('closed');
    });

    it('should reject member attempting to reopen a closed ticket with 403', async () => {
      vi.spyOn(ticketRepository, 'findByIdForUpdate').mockResolvedValue({
        ...mockTicket1,
        created_by_user_id: userC.id,
        status: 'closed',
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/status`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({ status: 'open' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_STATUS_TRANSITION');
    });

    it('should allow admin to reopen a closed ticket and clear lifecycle timestamps', async () => {
      vi.spyOn(ticketRepository, 'findByIdForUpdate').mockResolvedValue({
        ...mockTicket1,
        status: 'closed',
        resolved_at: new Date(),
        closed_at: new Date(),
      });
      vi.spyOn(ticketRepository, 'updateStatus').mockResolvedValue({
        ...mockTicket1,
        status: 'open',
        resolved_at: null,
        closed_at: null,
      });
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        ...mockTicket1,
        status: 'open',
        resolved_at: null,
        closed_at: null,
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/status`)
        .set('Authorization', `Bearer ${getJwt(userA)}`) // Owner
        .send({ status: 'open' });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('open');
      expect(res.body.data.ticket.resolvedAt).toBeNull();
      expect(res.body.data.ticket.closedAt).toBeNull();
    });

    it('should reject invalid topological transitions (e.g. open -> closed) with 400', async () => {
      vi.spyOn(ticketRepository, 'findByIdForUpdate').mockResolvedValue({
        ...mockTicket1,
        status: 'open',
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/status`)
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({ status: 'closed' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  // ==========================================
  // 6. COMMENTS & INTERNAL NOTES
  // ==========================================
  describe('6. Comments & Internal Notes', () => {
    const mockComment: TicketCommentWithAuthorEntity = {
      id: '88888888-8888-4888-8888-888888888881',
      organization_id: orgA.id,
      ticket_id: mockTicket1.id,
      author_user_id: userC.id,
      body: 'I am still seeing the error today.',
      visibility: 'public',
      created_at: new Date(),
      updated_at: null,
      author_name: userC.name,
      author_email: userC.email,
    };

    const mockInternalNote: TicketCommentWithAuthorEntity = {
      id: '88888888-8888-4888-8888-888888888882',
      organization_id: orgA.id,
      ticket_id: mockTicket1.id,
      author_user_id: userB.id,
      body: 'Database deadlocked during batch billing migration.',
      visibility: 'internal',
      created_at: new Date(),
      updated_at: null,
      author_name: userB.name,
      author_email: userB.email,
    };

    it('should allow member to add a public comment', async () => {
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue(mockTicket1);
      vi.spyOn(ticketCommentRepository, 'create').mockResolvedValue(mockComment);
      vi.spyOn(ticketCommentRepository, 'listByTicket').mockResolvedValue({
        total: 1,
        comments: [mockComment],
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/comments`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({
          body: 'I am still seeing the error today.',
          visibility: 'public',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.comment.body).toBe('I am still seeing the error today.');
      expect(res.body.data.comment.visibility).toBe('public');
    });

    it('should reject member attempting to create an internal note with 403', async () => {
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue(mockTicket1);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/comments`)
        .set('Authorization', `Bearer ${getJwt(userC)}`) // Member
        .send({
          body: 'Trying to create internal note.',
          visibility: 'internal',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_COMMENT');
    });

    it('should allow admin to create an internal note', async () => {
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue(mockTicket1);
      vi.spyOn(ticketCommentRepository, 'create').mockResolvedValue(mockInternalNote);
      vi.spyOn(ticketCommentRepository, 'listByTicket').mockResolvedValue({
        total: 1,
        comments: [mockInternalNote],
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/comments`)
        .set('Authorization', `Bearer ${getJwt(userB)}`) // Admin
        .send({
          body: 'Database deadlocked during batch billing migration.',
          visibility: 'internal',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.comment.visibility).toBe('internal');
    });

    it('should hide internal notes from member reading comments', async () => {
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue(mockTicket1);
      vi.spyOn(ticketCommentRepository, 'listByTicket').mockImplementation(
        async (_orgId, _ticketId, includeInternal) => {
          expect(includeInternal).toBe(false); // Member must not receive internal notes
          return {
            total: 1,
            comments: [mockComment],
          };
        }
      );

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/comments`)
        .set('Authorization', `Bearer ${getJwt(userC)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.comments.length).toBe(1);
      expect(res.body.data.comments[0].visibility).toBe('public');
    });

    it('should include internal notes for admin reading comments', async () => {
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue(mockTicket1);
      vi.spyOn(ticketCommentRepository, 'listByTicket').mockImplementation(
        async (_orgId, _ticketId, includeInternal) => {
          expect(includeInternal).toBe(true); // Admin receives internal notes
          return {
            total: 2,
            comments: [mockComment, mockInternalNote],
          };
        }
      );

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/comments`)
        .set('Authorization', `Bearer ${getJwt(userB)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.comments.length).toBe(2);
    });
  });

  // ==========================================
  // 7. TICKET UPDATES & ARCHIVING
  // ==========================================
  describe('7. Ticket Updates, Priority & Archival', () => {
    it('should allow creator to update own open, unassigned ticket', async () => {
      vi.spyOn(ticketRepository, 'findById')
        .mockResolvedValueOnce(mockTicket1)
        .mockResolvedValueOnce({
          ...mockTicket1,
          subject: 'Updated subject: Cannot login',
        });
      vi.spyOn(ticketRepository, 'findByIdForUpdate').mockResolvedValue(mockTicket1);
      vi.spyOn(ticketRepository, 'updateDetails').mockResolvedValue({
        ...mockTicket1,
        subject: 'Updated subject: Cannot login',
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({ subject: 'Updated subject: Cannot login' });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.subject).toBe('Updated subject: Cannot login');
    });

    it('should reject member attempting to update an assigned ticket with 403', async () => {
      const assignedTicket: TicketWithUsersEntity = {
        ...mockTicket1,
        assigned_to_user_id: userB.id, // Already assigned
      };

      vi.spyOn(ticketRepository, 'findById').mockResolvedValue(assignedTicket);

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({ subject: 'Attempt to update assigned ticket' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_UPDATE');
    });

    it('should allow admin to change priority, but reject member changing priority', async () => {
      vi.spyOn(ticketRepository, 'findByIdForUpdate').mockResolvedValue(mockTicket1);
      vi.spyOn(ticketRepository, 'updatePriority').mockResolvedValue({
        ...mockTicket1,
        priority: 'urgent',
      });
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        ...mockTicket1,
        priority: 'urgent',
      });

      // Admin changes priority -> 200
      const adminRes = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/priority`)
        .set('Authorization', `Bearer ${getJwt(userB)}`)
        .send({ priority: 'urgent' });

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.ticket.priority).toBe('urgent');

      // Member changes priority -> 403
      const memberRes = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/priority`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({ priority: 'urgent' });

      expect(memberRes.status).toBe(403);
      expect(memberRes.body.error.code).toBe('FORBIDDEN_PRIORITY');
    });

    it('should allow admin to archive ticket, but reject member with 403', async () => {
      vi.spyOn(ticketRepository, 'findByIdForUpdate').mockResolvedValue(mockTicket1);
      vi.spyOn(ticketRepository, 'archive').mockResolvedValue({
        ...mockTicket1,
        archived_at: new Date(),
      });
      vi.spyOn(ticketRepository, 'findById').mockResolvedValue({
        ...mockTicket1,
        archived_at: new Date(),
      });

      // Admin archives -> 200
      const adminRes = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/archive`)
        .set('Authorization', `Bearer ${getJwt(userB)}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.message).toBe('Ticket archived successfully');

      // Member archives -> 403
      const memberRes = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/tickets/${mockTicket1.id}/archive`)
        .set('Authorization', `Bearer ${getJwt(userC)}`);

      expect(memberRes.status).toBe(403);
      expect(memberRes.body.error.code).toBe('FORBIDDEN_ARCHIVE');
    });
  });

  // ==========================================
  // 8. MULTI-TENANT CROSS-TENANT ISOLATION
  // ==========================================
  describe('8. Multi-Tenant Cross-Tenant Data Isolation', () => {
    it('should reject Org A user from listing Org B tickets with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgB.id}/tickets`)
        .set('Authorization', `Bearer ${getJwt(userA)}`); // Alice is in Org A, not B

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('should reject Org A user from reading Org B ticket details with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgB.id}/tickets/${mockTicketInB.id}`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('should reject Org A user from commenting on Org B tickets with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgB.id}/tickets/${mockTicketInB.id}/comments`)
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({ body: 'Trying cross-tenant comment' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });
  });
});
