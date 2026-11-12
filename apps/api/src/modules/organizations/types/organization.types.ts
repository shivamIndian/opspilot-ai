export type OrganizationRole = 'owner' | 'admin' | 'member';

export type OrganizationStatus = 'active' | 'suspended' | 'archived';

export type MembershipStatus = 'active' | 'suspended' | 'removed';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export type InvitationRole = 'admin' | 'member';

export type OrganizationPermission =
  | 'organization:read'
  | 'organization:update'
  | 'organization:archive'
  | 'members:list'
  | 'members:remove'
  | 'members:role_update'
  | 'invitations:create'
  | 'invitations:list'
  | 'invitations:resend'
  | 'invitations:revoke'
  | 'ownership:transfer'
  | 'agent:approve'
  | 'dashboard:read';

export interface OrganizationEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  status: OrganizationStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface SafeOrganization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: OrganizationStatus;
  role?: OrganizationRole;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMemberEntity {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  status: MembershipStatus;
  joined_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationMemberWithUser {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  status: MembershipStatus;
  joinedAt: string;
}

export interface OrganizationInvitationEntity {
  id: string;
  organization_id: string;
  email: string;
  role: InvitationRole;
  token_hash: string;
  invited_by: string;
  status: InvitationStatus;
  expires_at: Date;
  accepted_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SafeOrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: InvitationRole;
  invitedBy: string;
  invitedByName?: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface OrganizationAuditLogEntity {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface OrganizationContext {
  id: string;
  role: OrganizationRole;
  membershipId: string;
  permissions: OrganizationPermission[];
}
