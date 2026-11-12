import type { OrganizationRole } from '../../organizations/types/organization.types.js';
import type { TicketEntity } from '../types/ticket.types.js';

export const isOrgAdminOrOwner = (role: OrganizationRole): boolean => {
  return role === 'owner' || role === 'admin';
};

/**
 * Checks whether an actor in an organization is permitted to view a specific ticket.
 * - Owner/Admin: Can view all tickets in the organization.
 * - Member: Can view tickets they created or tickets assigned to them.
 */
export const canViewTicket = (
  role: OrganizationRole,
  userId: string,
  ticket: TicketEntity
): boolean => {
  if (isOrgAdminOrOwner(role)) {
    return true;
  }
  return ticket.created_by_user_id === userId || ticket.assigned_to_user_id === userId;
};

/**
 * Checks whether an actor can edit the basic details of a ticket (subject, description, category).
 * - Owner/Admin: Can update any ticket in their organization (unless archived).
 * - Member: Can update only their own ticket, provided it is still 'open' and unassigned.
 */
export const canUpdateTicket = (
  role: OrganizationRole,
  userId: string,
  ticket: TicketEntity
): boolean => {
  if (ticket.archived_at !== null) {
    return false;
  }
  if (isOrgAdminOrOwner(role)) {
    return true;
  }
  return (
    ticket.created_by_user_id === userId &&
    ticket.status === 'open' &&
    ticket.assigned_to_user_id === null
  );
};

/**
 * Checks whether an actor can assign/unassign tickets.
 * Only owner/admin.
 */
export const canAssignTicket = (role: OrganizationRole): boolean => {
  return isOrgAdminOrOwner(role);
};

/**
 * Checks whether an actor can change ticket priority.
 * Only owner/admin.
 */
export const canChangeTicketPriority = (role: OrganizationRole): boolean => {
  return isOrgAdminOrOwner(role);
};

/**
 * Checks whether an actor can archive a ticket.
 * Only owner/admin.
 */
export const canArchiveTicket = (role: OrganizationRole): boolean => {
  return isOrgAdminOrOwner(role);
};

/**
 * Checks whether an actor can create internal notes.
 * Only owner/admin.
 */
export const canCreateInternalNote = (role: OrganizationRole): boolean => {
  return isOrgAdminOrOwner(role);
};

/**
 * Checks whether an actor can view internal notes.
 * Only owner/admin.
 */
export const canViewInternalNotes = (role: OrganizationRole): boolean => {
  return isOrgAdminOrOwner(role);
};
