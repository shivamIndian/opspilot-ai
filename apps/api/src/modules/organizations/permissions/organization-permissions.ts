import type { OrganizationRole, OrganizationPermission } from '../types/organization.types.js';

export const ROLE_PERMISSIONS: Record<OrganizationRole, OrganizationPermission[]> = {
  owner: [
    'organization:read',
    'organization:update',
    'organization:archive',
    'members:list',
    'members:remove',
    'members:role_update',
    'invitations:create',
    'invitations:list',
    'invitations:resend',
    'invitations:revoke',
    'ownership:transfer',
    'agent:approve',
    'dashboard:read',
  ],
  admin: [
    'organization:read',
    'organization:update',
    'members:list',
    'members:remove',
    'members:role_update',
    'invitations:create',
    'invitations:list',
    'invitations:resend',
    'invitations:revoke',
    'agent:approve',
    'dashboard:read',
  ],
  member: ['organization:read', 'members:list'],
};

export const hasOrganizationPermission = (
  role: OrganizationRole,
  permission: OrganizationPermission
): boolean => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};
