import { pool } from '../../../database/index.js';
import { invitationRepository } from '../repositories/invitation.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { memberRepository } from '../repositories/member.repository.js';
import { organizationAuditRepository } from '../repositories/organization-audit.repository.js';
import { userRepository } from '../../auth/repositories/user.repository.js';
import { tokenService } from '../../auth/services/token.service.js';
import { emailService } from '../../../integrations/email/email.service.js';
import type { InviteMemberInput } from '../validators/organization.schema.js';
import type {
  SafeOrganizationInvitation,
  OrganizationRole,
  InvitationStatus,
  SafeOrganization,
} from '../types/organization.types.js';

export class InvitationService {
  /**
   * Dispatches an organization invitation via email with a cryptographically hashed token.
   */
  async createInvitation(
    organizationId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    input: InviteMemberInput
  ): Promise<SafeOrganizationInvitation> {
    if (actorRole === 'admin' && input.role === 'admin') {
      throw new Error('ADMIN_CANNOT_INVITE_ADMIN');
    }

    const email = input.email.toLowerCase().trim();

    // 1. Check if user already holds active membership
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const activeMember = await memberRepository.findByOrgAndUser(organizationId, existingUser.id);
      if (activeMember && activeMember.status === 'active') {
        throw new Error('USER_ALREADY_MEMBER');
      }
    }

    // 2. Check for duplicate pending invitation
    const existingInvitation = await invitationRepository.findPendingByOrgAndEmail(
      organizationId,
      email
    );
    if (existingInvitation) {
      throw new Error('PENDING_INVITATION_EXISTS');
    }

    // 3. Issue one-time token and compute SHA-256 hash
    const rawToken = tokenService.generateRandomToken();
    const tokenHash = tokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await invitationRepository.create({
      organizationId,
      email,
      role: input.role,
      tokenHash,
      invitedBy: actorUserId,
      expiresAt,
    });

    const org = await organizationRepository.findById(organizationId);
    const actor = await userRepository.findById(actorUserId);

    // 4. Send email notification
    await emailService.sendOrganizationInvitation(
      email,
      org?.name || 'an organization',
      rawToken,
      input.role,
      actor?.name
    );

    await organizationAuditRepository.logEvent({
      organizationId,
      actorUserId,
      action: 'member.invited',
      targetType: 'invitation',
      targetId: invitation.id,
      metadata: { email, role: input.role },
    });

    return {
      id: invitation.id,
      organizationId: invitation.organization_id,
      email: invitation.email,
      role: invitation.role,
      invitedBy: invitation.invited_by,
      invitedByName: actor?.name,
      status: invitation.status,
      expiresAt: invitation.expires_at.toISOString(),
      createdAt: invitation.created_at.toISOString(),
    };
  }

  /**
   * Lists invitations for an organization.
   */
  async listInvitations(
    organizationId: string,
    options: {
      status?: InvitationStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    invitations: SafeOrganizationInvitation[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const [invitations, total] = await Promise.all([
      invitationRepository.listByOrganization(organizationId, options),
      invitationRepository.countByOrganization(organizationId, options),
    ]);

    return {
      invitations,
      total,
      limit: Math.min(Math.max(options.limit || 20, 1), 100),
      offset: Math.max(options.offset || 0, 0),
    };
  }

  /**
   * Resends an invitation with token rotation.
   */
  async resendInvitation(
    organizationId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    invitationId: string
  ): Promise<void> {
    const invitation = await invitationRepository.findById(invitationId, organizationId);
    if (!invitation || invitation.status !== 'pending') {
      throw new Error('INVITATION_NOT_FOUND_OR_INACTIVE');
    }

    if (actorRole === 'admin' && invitation.role === 'admin') {
      throw new Error('ADMIN_CANNOT_MANAGE_ADMIN_INVITATIONS');
    }

    const newRawToken = tokenService.generateRandomToken();
    const newTokenHash = tokenService.hashToken(newRawToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await invitationRepository.updateToken(
      invitationId,
      organizationId,
      newTokenHash,
      newExpiresAt
    );

    const org = await organizationRepository.findById(organizationId);
    const actor = await userRepository.findById(actorUserId);

    await emailService.sendOrganizationInvitation(
      invitation.email,
      org?.name || 'an organization',
      newRawToken,
      invitation.role,
      actor?.name
    );

    await organizationAuditRepository.logEvent({
      organizationId,
      actorUserId,
      action: 'invitation.resent',
      targetType: 'invitation',
      targetId: invitation.id,
      metadata: { email: invitation.email },
    });
  }

  /**
   * Revokes a pending invitation.
   */
  async revokeInvitation(
    organizationId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    invitationId: string
  ): Promise<void> {
    const invitation = await invitationRepository.findById(invitationId, organizationId);
    if (!invitation || invitation.status !== 'pending') {
      throw new Error('INVITATION_NOT_FOUND_OR_INACTIVE');
    }

    if (actorRole === 'admin' && invitation.role === 'admin') {
      throw new Error('ADMIN_CANNOT_MANAGE_ADMIN_INVITATIONS');
    }

    await invitationRepository.revoke(invitationId, organizationId);

    await organizationAuditRepository.logEvent({
      organizationId,
      actorUserId,
      action: 'invitation.revoked',
      targetType: 'invitation',
      targetId: invitation.id,
      metadata: { email: invitation.email },
    });
  }

  /**
   * Accepts an invitation using a single-use token.
   */
  async acceptInvitation(
    userId: string,
    rawToken: string
  ): Promise<{ organization: SafeOrganization; role: OrganizationRole }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (!user.email_verified_at) {
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    const tokenHash = tokenService.hashToken(rawToken);
    const invitation = await invitationRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new Error('INVALID_INVITATION_TOKEN');
    }

    if (invitation.status === 'accepted') {
      throw new Error('INVITATION_ALREADY_ACCEPTED');
    }

    if (invitation.status === 'revoked') {
      throw new Error('INVITATION_REVOKED');
    }

    if (new Date() > new Date(invitation.expires_at)) {
      throw new Error('INVITATION_EXPIRED');
    }

    // Verify email matching
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new Error('INVITATION_EMAIL_MISMATCH');
    }

    const org = await organizationRepository.findById(invitation.organization_id);
    if (!org || org.status !== 'active') {
      throw new Error('ORGANIZATION_INACTIVE_OR_ARCHIVED');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Ensure not already an active member
      const existingMember = await memberRepository.findByOrgAndUser(
        invitation.organization_id,
        user.id,
        client
      );

      if (existingMember && existingMember.status === 'active') {
        throw new Error('ALREADY_ORGANIZATION_MEMBER');
      }

      // Create or reactivate membership with invited role
      await memberRepository.create(
        {
          organizationId: invitation.organization_id,
          userId: user.id,
          role: invitation.role,
          status: 'active',
        },
        client
      );

      // Consume invitation
      await invitationRepository.markAccepted(invitation.id, client);

      await organizationAuditRepository.logEvent(
        {
          organizationId: invitation.organization_id,
          actorUserId: user.id,
          action: 'member.joined',
          targetType: 'member',
          targetId: user.id,
          metadata: { role: invitation.role, invitationId: invitation.id },
        },
        client
      );

      await client.query('COMMIT;');

      return {
        organization: organizationRepository.toSafeOrganization(org, invitation.role),
        role: invitation.role,
      };
    } catch (error) {
      await client.query('ROLLBACK;');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const invitationService = new InvitationService();
