import { memberRepository } from '../repositories/member.repository.js';
import { organizationAuditRepository } from '../repositories/organization-audit.repository.js';
import type {
  OrganizationRole,
  MembershipStatus,
  OrganizationMemberWithUser,
} from '../types/organization.types.js';

export class MemberService {
  /**
   * Retrieves paginated members for an organization.
   */
  async listMembers(
    organizationId: string,
    options: {
      search?: string;
      role?: OrganizationRole;
      status?: MembershipStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    members: OrganizationMemberWithUser[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const [members, total] = await Promise.all([
      memberRepository.listByOrganization(organizationId, options),
      memberRepository.countByOrganization(organizationId, options),
    ]);

    return {
      members,
      total,
      limit: Math.min(Math.max(options.limit || 20, 1), 100),
      offset: Math.max(options.offset || 0, 0),
    };
  }

  /**
   * Modifies an organization member's role obeying hierarchical permissions.
   */
  async updateMemberRole(
    organizationId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    targetMemberId: string,
    newRole: OrganizationRole
  ): Promise<OrganizationMemberWithUser> {
    if (newRole === 'owner') {
      throw new Error('CANNOT_SET_OWNER_ROLE_VIA_UPDATE');
    }

    const target = await memberRepository.findById(targetMemberId, organizationId);
    if (!target || target.status !== 'active') {
      throw new Error('MEMBER_NOT_FOUND');
    }

    if (target.role === 'owner') {
      throw new Error('CANNOT_DEMOTE_OR_MODIFY_OWNER_ROLE');
    }

    // Role hierarchy checks
    if (actorRole === 'admin') {
      if (target.role === 'admin' || newRole === 'admin') {
        throw new Error('ADMIN_CANNOT_MANAGE_ADMINS');
      }
    }

    const updated = await memberRepository.updateRole(targetMemberId, organizationId, newRole);
    if (!updated) {
      throw new Error('MEMBER_NOT_FOUND');
    }

    await organizationAuditRepository.logEvent({
      organizationId,
      actorUserId,
      action: 'member.role_updated',
      targetType: 'member',
      targetId: target.id,
      metadata: { previousRole: target.role, newRole },
    });

    // Return full member details
    const memberList = await memberRepository.listByOrganization(organizationId, {
      status: 'active',
      limit: 1,
    });
    const matched = memberList.find(m => m.membershipId === targetMemberId);

    return (
      matched || {
        membershipId: updated.id,
        userId: updated.user_id,
        name: '',
        email: '',
        role: updated.role,
        status: updated.status,
        joinedAt: updated.joined_at.toISOString(),
      }
    );
  }

  /**
   * Removes a member from an organization.
   */
  async removeMember(
    organizationId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    targetMemberId: string
  ): Promise<void> {
    const target = await memberRepository.findById(targetMemberId, organizationId);
    if (!target || target.status === 'removed') {
      throw new Error('MEMBER_NOT_FOUND');
    }

    if (target.role === 'owner') {
      throw new Error('CANNOT_REMOVE_ORGANIZATION_OWNER');
    }

    if (actorRole === 'admin' && target.role === 'admin') {
      throw new Error('ADMIN_CANNOT_REMOVE_ADMINS');
    }

    await memberRepository.updateStatus(targetMemberId, organizationId, 'removed');

    await organizationAuditRepository.logEvent({
      organizationId,
      actorUserId,
      action: 'member.removed',
      targetType: 'member',
      targetId: target.id,
      metadata: { removedUserId: target.user_id, previousRole: target.role },
    });
  }

  /**
   * Self-exit from an organization. Owner cannot leave without transferring ownership.
   */
  async leaveOrganization(organizationId: string, userId: string): Promise<void> {
    const membership = await memberRepository.findByOrgAndUser(organizationId, userId);
    if (!membership || membership.status !== 'active') {
      throw new Error('NOT_ACTIVE_MEMBER');
    }

    if (membership.role === 'owner') {
      throw new Error('OWNER_CANNOT_LEAVE_WITHOUT_TRANSFER');
    }

    await memberRepository.updateStatus(membership.id, organizationId, 'removed');

    await organizationAuditRepository.logEvent({
      organizationId,
      actorUserId: userId,
      action: 'member.removed',
      targetType: 'member',
      targetId: membership.id,
      metadata: { reason: 'self_exit', previousRole: membership.role },
    });
  }

  /**
   * Transfers organization ownership atomically to an active member.
   */
  async transferOwnership(
    organizationId: string,
    currentOwnerUserId: string,
    newOwnerUserId: string
  ): Promise<{ message: string }> {
    await memberRepository.transferOwnershipTx(organizationId, currentOwnerUserId, newOwnerUserId);

    await organizationAuditRepository.logEvent({
      organizationId,
      actorUserId: currentOwnerUserId,
      action: 'ownership.transferred',
      targetType: 'user',
      targetId: newOwnerUserId,
      metadata: { previousOwnerUserId: currentOwnerUserId, newOwnerUserId },
    });

    return { message: 'Organization ownership transferred successfully' };
  }
}

export const memberService = new MemberService();
