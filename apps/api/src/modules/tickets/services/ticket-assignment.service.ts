import type { Pool } from 'pg';
import { pool } from '../../../database/index.js';
import { ticketRepository, TicketRepository } from '../repositories/ticket.repository.js';
import {
  ticketActivityRepository,
  TicketActivityRepository,
} from '../repositories/ticket-activity.repository.js';
import {
  memberRepository,
  MemberRepository,
} from '../../organizations/repositories/member.repository.js';
import { canAssignTicket } from '../permissions/ticket-permissions.js';
import type { OrganizationRole } from '../../organizations/types/organization.types.js';
import type { SafeTicket } from '../types/ticket.types.js';

export class TicketAssignmentService {
  constructor(
    private db: Pool = pool,
    private ticketRepo: TicketRepository = ticketRepository,
    private activityRepo: TicketActivityRepository = ticketActivityRepository,
    private memberRepo: MemberRepository = memberRepository
  ) {}

  /**
   * Assigns or unassigns a ticket to an active organization member.
   * Target user must have an active membership in the same organization.
   */
  async assignTicket(
    organizationId: string,
    ticketId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    targetUserId: string | null
  ): Promise<SafeTicket> {
    if (!canAssignTicket(actorRole)) {
      throw new Error('FORBIDDEN_CANNOT_ASSIGN_TICKET: Only owner or admin may assign tickets');
    }

    // If targetUserId is provided, verify active membership in this organization
    if (targetUserId) {
      const membership = await this.memberRepo.findByOrgAndUser(organizationId, targetUserId);

      if (!membership || membership.status !== 'active') {
        throw new Error(
          'ASSIGNEE_NOT_ACTIVE_MEMBER: Target user is not an active member of this organization'
        );
      }
    }

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const ticket = await this.ticketRepo.findByIdForUpdate(organizationId, ticketId, client);

      if (!ticket) {
        throw new Error('TICKET_NOT_FOUND');
      }

      if (ticket.archived_at !== null) {
        throw new Error('CANNOT_MODIFY_ARCHIVED_TICKET');
      }

      const previousAssigneeId = ticket.assigned_to_user_id;

      // Update assignment
      await this.ticketRepo.updateAssignment(organizationId, ticketId, targetUserId, client);

      // Log activity
      const isUnassign = targetUserId === null;
      await this.activityRepo.logActivity(
        {
          organizationId,
          ticketId,
          actorUserId,
          action: isUnassign ? 'ticket.unassigned' : 'ticket.assigned',
          oldValues: { assigned_to_user_id: previousAssigneeId },
          newValues: { assigned_to_user_id: targetUserId },
          metadata: {
            assignedBy: actorUserId,
          },
        },
        client
      );

      await client.query('COMMIT');

      const updated = await this.ticketRepo.findById(organizationId, ticketId);
      if (!updated) {
        throw new Error('TICKET_NOT_FOUND');
      }

      return this.ticketRepo.toSafeTicket(updated);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const ticketAssignmentService = new TicketAssignmentService();
