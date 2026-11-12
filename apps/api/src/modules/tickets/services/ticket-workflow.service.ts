import type { Pool } from 'pg';
import { pool } from '../../../database/index.js';
import { ticketRepository, TicketRepository } from '../repositories/ticket.repository.js';
import {
  ticketActivityRepository,
  TicketActivityRepository,
} from '../repositories/ticket-activity.repository.js';
import { isOrgAdminOrOwner } from '../permissions/ticket-permissions.js';
import type { OrganizationRole } from '../../organizations/types/organization.types.js';
import type { TicketStatus, TicketAction, SafeTicket } from '../types/ticket.types.js';

export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'waiting_on_customer', 'resolved'],
  in_progress: ['waiting_on_customer', 'resolved'],
  waiting_on_customer: ['in_progress', 'resolved'],
  resolved: ['closed', 'open'],
  closed: ['open'],
};

export class TicketWorkflowService {
  constructor(
    private db: Pool = pool,
    private ticketRepo: TicketRepository = ticketRepository,
    private activityRepo: TicketActivityRepository = ticketActivityRepository
  ) {}

  /**
   * Validates whether a state transition is topologically allowed.
   */
  isValidTransition(currentStatus: TicketStatus, targetStatus: TicketStatus): boolean {
    if (currentStatus === targetStatus) {
      return false;
    }
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(targetStatus) : false;
  }

  /**
   * Executes a validated ticket status transition within a database transaction.
   */
  async transitionStatus(
    organizationId: string,
    ticketId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    targetStatus: TicketStatus
  ): Promise<SafeTicket> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock the ticket row
      const ticket = await this.ticketRepo.findByIdForUpdate(organizationId, ticketId, client);

      if (!ticket) {
        throw new Error('TICKET_NOT_FOUND');
      }

      if (ticket.archived_at !== null) {
        throw new Error('CANNOT_MODIFY_ARCHIVED_TICKET');
      }

      const currentStatus = ticket.status;

      // 2. Validate topological transition
      if (!this.isValidTransition(currentStatus, targetStatus)) {
        throw new Error(
          `INVALID_STATUS_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`
        );
      }

      // 3. Authorization check based on role and transition type
      const isAdminOrOwner = isOrgAdminOrOwner(actorRole);

      if (!isAdminOrOwner) {
        // Members may ONLY close their own tickets when resolved
        if (
          currentStatus === 'resolved' &&
          targetStatus === 'closed' &&
          ticket.created_by_user_id === actorUserId
        ) {
          // Permitted: creator closing own resolved ticket
        } else {
          // All other transitions require owner or admin
          throw new Error(
            'FORBIDDEN_STATUS_TRANSITION: Insufficient permissions for this status transition'
          );
        }
      }

      // 4. Calculate lifecycle timestamps
      let resolvedAt = ticket.resolved_at;
      let closedAt = ticket.closed_at;

      if (targetStatus === 'resolved') {
        resolvedAt = new Date();
        closedAt = null;
      } else if (targetStatus === 'closed') {
        closedAt = new Date();
        if (!resolvedAt) {
          resolvedAt = new Date();
        }
      } else if (targetStatus === 'open') {
        // Reopening clears both
        resolvedAt = null;
        closedAt = null;
      } else {
        // in_progress or waiting_on_customer
        resolvedAt = null;
        closedAt = null;
      }

      // 5. Update ticket in database
      await this.ticketRepo.updateStatus(
        organizationId,
        ticketId,
        targetStatus,
        resolvedAt,
        closedAt,
        client
      );

      // 6. Determine action log event
      let action: TicketAction = 'ticket.status_changed';
      if (targetStatus === 'resolved') {
        action = 'ticket.resolved';
      } else if (targetStatus === 'closed') {
        action = 'ticket.closed';
      } else if (
        targetStatus === 'open' &&
        (currentStatus === 'resolved' || currentStatus === 'closed')
      ) {
        action = 'ticket.reopened';
      }

      await this.activityRepo.logActivity(
        {
          organizationId,
          ticketId,
          actorUserId,
          action,
          oldValues: {
            status: currentStatus,
            resolved_at: ticket.resolved_at?.toISOString() || null,
            closed_at: ticket.closed_at?.toISOString() || null,
          },
          newValues: {
            status: targetStatus,
            resolved_at: resolvedAt?.toISOString() || null,
            closed_at: closedAt?.toISOString() || null,
          },
          metadata: {
            transition: `${currentStatus} -> ${targetStatus}`,
          },
        },
        client
      );

      await client.query('COMMIT');

      // Fetch fresh record with joined user details
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

export const ticketWorkflowService = new TicketWorkflowService();
