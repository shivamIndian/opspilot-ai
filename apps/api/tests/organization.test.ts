import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/index.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { invitationRepository } from '../src/modules/organizations/repositories/invitation.repository.js';
import { organizationAuditRepository } from '../src/modules/organizations/repositories/organization-audit.repository.js';
import { userRepository } from '../src/modules/auth/repositories/user.repository.js';
import { emailService } from '../src/integrations/email/email.service.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
  OrganizationInvitationEntity,
} from '../src/modules/organizations/types/organization.types.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';

describe('OpsPilot API – Organization & Multi-Tenancy Module 04', () => {
  // Test Users
  const userA: UserEntity = {
    id: '11111111-1111-1111-1111-111111111111',
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
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Bob Owner',
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
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Charlie Dual',
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

  const platformAdmin: UserEntity = {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'System Admin',
    email: 'sysadmin@opspilot.local',
    password_hash: 'hashAdmin',
    platform_role: 'platform_admin',
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
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Organization A',
    slug: 'org-a',
    description: 'First test org',
    logo_url: null,
    status: 'active',
    created_by: userA.id,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const orgB: OrganizationEntity = {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Organization B',
    slug: 'org-b',
    description: 'Second test org',
    logo_url: null,
    status: 'active',
    created_by: userB.id,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Memberships
  const memberAliceInA: OrganizationMemberEntity = {
    id: 'mem-alice-a',
    organization_id: orgA.id,
    user_id: userA.id,
    role: 'owner',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberBobInB: OrganizationMemberEntity = {
    id: 'mem-bob-b',
    organization_id: orgB.id,
    user_id: userB.id,
    role: 'owner',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberCharlieInA: OrganizationMemberEntity = {
    id: 'mem-charlie-a',
    organization_id: orgA.id,
    user_id: userC.id,
    role: 'member',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const memberCharlieInB: OrganizationMemberEntity = {
    id: 'mem-charlie-b',
    organization_id: orgB.id,
    user_id: userC.id,
    role: 'admin',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  // JWT Helper
  const getJwt = (user: UserEntity) =>
    tokenService.generateAccessToken(user.id, user.platform_role).token;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(organizationAuditRepository, 'logEvent').mockResolvedValue({
      id: 'audit-1',
      organization_id: orgA.id,
      actor_user_id: userA.id,
      action: 'action',
      target_type: null,
      target_id: null,
      metadata: {},
      created_at: new Date(),
    });
    vi.spyOn(emailService, 'sendOrganizationInvitation').mockResolvedValue();
  });

  describe('1. Organization Creation', () => {
    it('POST /api/v1/organizations should create organization and assign creator as active owner', async () => {
      vi.spyOn(organizationRepository, 'findBySlug').mockResolvedValue(null);
      vi.spyOn(organizationRepository, 'create').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'create').mockResolvedValue(memberAliceInA);

      // Mock pool.connect for transaction
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'connect').mockResolvedValue(mockClient as any);

      const res = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({
          name: 'Organization A',
          slug: 'org-a',
          description: 'First test org',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.name).toBe('Organization A');
      expect(res.body.data.organization.role).toBe('owner');
      expect(organizationRepository.create).toHaveBeenCalled();
      expect(memberRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgA.id,
          userId: userA.id,
          role: 'owner',
          status: 'active',
        }),
        expect.anything()
      );
    });

    it('POST /api/v1/organizations should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/v1/organizations').send({
        name: 'Unauthenticated Org',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/organizations should reject duplicate slug with 409', async () => {
      vi.spyOn(organizationRepository, 'findBySlug').mockResolvedValue(orgA);

      const res = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({
          name: 'Duplicate Org',
          slug: 'org-a',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SLUG_ALREADY_EXISTS');
    });

    it('POST /api/v1/organizations should reject invalid name with 400', async () => {
      const res = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({
          name: 'A', // Too short (min 2)
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Organization Listing & Details', () => {
    it('GET /api/v1/organizations should return only organizations where user has active membership', async () => {
      vi.spyOn(organizationRepository, 'listByUser').mockResolvedValue([
        { ...orgA, role: 'owner', joined_at: memberAliceInA.joined_at },
      ]);

      const res = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organizations).toHaveLength(1);
      expect(res.body.data.organizations[0].id).toBe(orgA.id);
      expect(res.body.data.organizations[0].role).toBe('owner');
      expect(organizationRepository.listByUser).toHaveBeenCalledWith(userA.id);
    });

    it('GET /api/v1/organizations/:organizationId should return organization details for active member', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberAliceInA);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.id).toBe(orgA.id);
      expect(res.body.data.organization.role).toBe('owner');
    });

    it('GET /api/v1/organizations/:organizationId should reject non-member with 403', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(null); // Not a member

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}`)
        .set('Authorization', `Bearer ${getJwt(userB)}`); // Bob querying Org A

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('GET /api/v1/organizations/:organizationId should reject when organization is archived', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue({
        ...orgA,
        status: 'archived',
      });

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ORGANIZATION_ARCHIVED');
    });
  });

  describe('3. Organization Profile Updates & Archival', () => {
    it('PATCH /api/v1/organizations/:organizationId should allow owner to update settings', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberAliceInA);
      vi.spyOn(organizationRepository, 'update').mockResolvedValue({
        ...orgA,
        name: 'Organization A Updated',
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}`)
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({
          name: 'Organization A Updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(organizationRepository.update).toHaveBeenCalled();
    });

    it('PATCH /api/v1/organizations/:organizationId should reject member with 403', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberCharlieInA); // Charlie is 'member' in Org A

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({
          name: 'Hacked Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_ORGANIZATION_PERMISSIONS');
    });

    it('POST /api/v1/organizations/:organizationId/archive should allow owner to archive', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberAliceInA); // Owner
      vi.spyOn(organizationRepository, 'archive').mockResolvedValue({
        ...orgA,
        status: 'archived',
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/archive`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(organizationRepository.archive).toHaveBeenCalledWith(orgA.id);
    });

    it('POST /api/v1/organizations/:organizationId/archive should reject admin with 403', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgB);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberCharlieInB); // Charlie is admin in Org B

      const res = await request(app)
        .post(`/api/v1/organizations/${orgB.id}/archive`)
        .set('Authorization', `Bearer ${getJwt(userC)}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_ORGANIZATION_ROLE');
    });
  });

  describe('4. Member Management', () => {
    it('GET /api/v1/organizations/:organizationId/members should return member directory', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberAliceInA);
      vi.spyOn(memberRepository, 'listByOrganization').mockResolvedValue([
        {
          membershipId: memberAliceInA.id,
          userId: userA.id,
          name: userA.name,
          email: userA.email,
          role: 'owner',
          status: 'active',
          joinedAt: memberAliceInA.joined_at.toISOString(),
        },
      ]);
      vi.spyOn(memberRepository, 'countByOrganization').mockResolvedValue(1);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/members`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.members).toHaveLength(1);
    });

    it('PATCH /api/v1/organizations/:organizationId/members/:memberId/role should allow owner to promote member to admin', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberAliceInA); // Owner
      vi.spyOn(memberRepository, 'findById').mockResolvedValue(memberCharlieInA); // Target is member
      vi.spyOn(memberRepository, 'updateRole').mockResolvedValue({
        ...memberCharlieInA,
        role: 'admin',
      });
      vi.spyOn(memberRepository, 'listByOrganization').mockResolvedValue([
        {
          membershipId: memberCharlieInA.id,
          userId: userC.id,
          name: userC.name,
          email: userC.email,
          role: 'admin',
          status: 'active',
          joinedAt: memberCharlieInA.joined_at.toISOString(),
        },
      ]);

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/members/${memberCharlieInA.id}/role`)
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(memberRepository.updateRole).toHaveBeenCalledWith(
        memberCharlieInA.id,
        orgA.id,
        'admin'
      );
    });

    it('PATCH /api/v1/organizations/:organizationId/members/:memberId/role should reject assigning owner role via update endpoint', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberAliceInA);

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgA.id}/members/${memberCharlieInA.id}/role`)
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({ role: 'owner' }); // Invalid via this endpoint

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('DELETE /api/v1/organizations/:organizationId/members/:memberId should reject removing active owner', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberAliceInA);
      vi.spyOn(memberRepository, 'findById').mockResolvedValue(memberAliceInA); // Target is owner

      const res = await request(app)
        .delete(`/api/v1/organizations/${orgA.id}/members/${memberAliceInA.id}`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_CANNOT_REMOVE_OWNER');
    });

    it('POST /api/v1/organizations/:organizationId/leave should reject owner leaving without transferring ownership', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberAliceInA); // Alice is owner

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/leave`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OWNER_CANNOT_LEAVE');
    });

    it('POST /api/v1/organizations/:organizationId/leave should allow standard member to leave', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberCharlieInA); // Charlie is normal member
      vi.spyOn(memberRepository, 'updateStatus').mockResolvedValue({
        ...memberCharlieInA,
        status: 'removed',
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/leave`)
        .set('Authorization', `Bearer ${getJwt(userC)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(memberRepository.updateStatus).toHaveBeenCalledWith(
        memberCharlieInA.id,
        orgA.id,
        'removed'
      );
    });
  });

  describe('5. Ownership Transfer', () => {
    it('POST /api/v1/organizations/:organizationId/transfer-ownership should atomically transfer ownership to active member', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberAliceInA);
      vi.spyOn(memberRepository, 'transferOwnershipTx').mockResolvedValue({
        previousOwner: { ...memberAliceInA, role: 'admin' },
        newOwner: { ...memberCharlieInA, role: 'owner' },
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/transfer-ownership`)
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({ newOwnerUserId: userC.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(memberRepository.transferOwnershipTx).toHaveBeenCalledWith(
        orgA.id,
        userA.id,
        userC.id
      );
    });

    it('POST /api/v1/organizations/:organizationId/transfer-ownership should reject non-owner with 403', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberCharlieInA); // Charlie is normal member

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/transfer-ownership`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({ newOwnerUserId: userB.id });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_ORGANIZATION_ROLE');
    });

    it('POST /api/v1/organizations/:organizationId/transfer-ownership should reject transfer to self', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberAliceInA);
      vi.spyOn(memberRepository, 'transferOwnershipTx').mockRejectedValue(
        new Error('CANNOT_TRANSFER_TO_SELF')
      );

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/transfer-ownership`)
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({ newOwnerUserId: userA.id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_TRANSFER_TO_SELF');
    });
  });

  describe('6. Invitations & Acceptance Flow', () => {
    it('POST /api/v1/organizations/:organizationId/invitations should dispatch invitation and never leak token', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberAliceInA); // Owner
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(invitationRepository, 'findPendingByOrgAndEmail').mockResolvedValue(null);
      vi.spyOn(invitationRepository, 'create').mockResolvedValue({
        id: 'inv-1',
        organization_id: orgA.id,
        email: 'newuser@example.com',
        role: 'member',
        token_hash: 'hashedtoken123',
        invited_by: userA.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 86400000),
        accepted_at: null,
        revoked_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      vi.spyOn(userRepository, 'findById').mockResolvedValue(userA);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/invitations`)
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({
          email: 'newuser@example.com',
          role: 'member',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invitation.email).toBe('newuser@example.com');
      // Crucial security check: raw token and token hash must NOT be exposed
      expect(res.body.data.invitation.token).toBeUndefined();
      expect(res.body.data.invitation.token_hash).toBeUndefined();
      expect(emailService.sendOrganizationInvitation).toHaveBeenCalled();
    });

    it('POST /api/v1/organizations/:organizationId/invitations should reject admin inviting another admin', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgB);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberCharlieInB); // Charlie is Admin in Org B

      const res = await request(app)
        .post(`/api/v1/organizations/${orgB.id}/invitations`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({
          email: 'anotheradmin@example.com',
          role: 'admin',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_CANNOT_INVITE_ADMIN');
    });

    it('POST /api/v1/organizations/:organizationId/invitations should reject member inviting anyone', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(memberCharlieInA); // Charlie is Member in Org A

      const res = await request(app)
        .post(`/api/v1/organizations/${orgA.id}/invitations`)
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({
          email: 'someone@example.com',
          role: 'member',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_ORGANIZATION_PERMISSIONS');
    });

    it('POST /api/v1/invitations/accept should successfully accept invitation for matching verified user', async () => {
      const inviteToken = 'valid-invitation-token-12345';
      const inviteHash = tokenService.hashToken(inviteToken);

      const mockInvitation: OrganizationInvitationEntity = {
        id: 'inv-target',
        organization_id: orgA.id,
        email: userC.email,
        role: 'member',
        token_hash: inviteHash,
        invited_by: userA.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000),
        accepted_at: null,
        revoked_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.spyOn(userRepository, 'findById').mockResolvedValue(userC); // Verified email
      vi.spyOn(invitationRepository, 'findByTokenHash').mockResolvedValue(mockInvitation);
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);

      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'connect').mockResolvedValue(mockClient as any);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(null);
      vi.spyOn(memberRepository, 'create').mockResolvedValue(memberCharlieInA);
      vi.spyOn(invitationRepository, 'markAccepted').mockResolvedValue({
        ...mockInvitation,
        status: 'accepted',
      });

      const res = await request(app)
        .post('/api/v1/invitations/accept')
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({ token: inviteToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.id).toBe(orgA.id);
      expect(res.body.data.role).toBe('member');
    });

    it('POST /api/v1/invitations/accept should reject email mismatch with 403', async () => {
      const inviteToken = 'token-for-different-email';
      const mockInvitation: OrganizationInvitationEntity = {
        id: 'inv-target',
        organization_id: orgA.id,
        email: 'differentuser@example.com', // NOT userC's email
        role: 'member',
        token_hash: tokenService.hashToken(inviteToken),
        invited_by: userA.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000),
        accepted_at: null,
        revoked_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.spyOn(userRepository, 'findById').mockResolvedValue(userC);
      vi.spyOn(invitationRepository, 'findByTokenHash').mockResolvedValue(mockInvitation);

      const res = await request(app)
        .post('/api/v1/invitations/accept')
        .set('Authorization', `Bearer ${getJwt(userC)}`)
        .send({ token: inviteToken });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INVITATION_EMAIL_MISMATCH');
    });

    it('POST /api/v1/invitations/accept should reject unverified email user with 403', async () => {
      const inviteToken = 'token-unverified';
      const unverifiedUser: UserEntity = {
        ...userC,
        email_verified_at: null, // Unverified!
      };

      vi.spyOn(userRepository, 'findById').mockResolvedValue(unverifiedUser);

      const res = await request(app)
        .post('/api/v1/invitations/accept')
        .set('Authorization', `Bearer ${getJwt(unverifiedUser)}`)
        .send({ token: inviteToken });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });
  });

  describe('7. Multi-Tenancy Cross-Tenant Data Isolation', () => {
    it('User A in Org A cannot access Org B details', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgB);
      // User A has NO membership in Org B
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgB.id}`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('User A in Org A cannot list members of Org B', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgB);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgB.id}/members`)
        .set('Authorization', `Bearer ${getJwt(userA)}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('User A in Org A cannot dispatch invitations in Org B', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgB);
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgB.id}/invitations`)
        .set('Authorization', `Bearer ${getJwt(userA)}`)
        .send({
          email: 'intruder@example.com',
          role: 'member',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });

    it('Platform Admin does not automatically gain organization access without active membership', async () => {
      vi.spyOn(organizationRepository, 'findById').mockResolvedValue(orgA);
      // Platform admin has no org membership
      vi.spyOn(memberRepository, 'findByOrgAndUser').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}`)
        .set('Authorization', `Bearer ${getJwt(platformAdmin)}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_NOT_ORGANIZATION_MEMBER');
    });
  });
});
