export type OrganizationRole = 'owner' | 'admin' | 'member';

export type OrganizationStatus = 'active' | 'suspended' | 'archived';

export type MembershipStatus = 'active' | 'suspended' | 'removed';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export type InvitationRole = 'admin' | 'member';

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

export interface OrganizationMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  status: MembershipStatus;
  joinedAt: string;
}

export interface OrganizationInvitation {
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

export interface OrganizationAuditLog {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
