import type { Pool } from 'pg';
import { pool } from '../../../database/index.js';
import { ticketRepository, TicketRepository } from '../repositories/ticket.repository.js';
import {
  ticketCounterRepository,
  TicketCounterRepository,
} from '../repositories/ticket-counter.repository.js';
import {
  ticketActivityRepository,
  TicketActivityRepository,
} from '../repositories/ticket-activity.repository.js';
import {
  canViewTicket,
  canUpdateTicket,
  canChangeTicketPriority,
  canArchiveTicket,
} from '../permissions/ticket-permissions.js';
import type { OrganizationRole } from '../../organizations/types/organization.types.js';
import type {
  CreateTicketInput,
  UpdateTicketInput,
  TicketQueryInput,
} from '../validators/ticket.schema.js';
import type { SafeTicket, TicketPriority, TicketSummaryMetrics } from '../types/ticket.types.js';

export class TicketService {
  constructor(
    private db: Pool = pool,
    private ticketRepo: TicketRepository = ticketRepository,
    private counterRepo: TicketCounterRepository = ticketCounterRepository,
    private activityRepo: TicketActivityRepository = ticketActivityRepository
  ) {}

  /**
   * Creates a new support ticket inside a database transaction, atomically assigning
   * an organization-specific ticket number and logging the creation event.
   */
  async createTicket(
    organizationId: string,
    actorUserId: string,
    input: CreateTicketInput
  ): Promise<SafeTicket> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // 1. Concurrency-safe atomic ticket number increment for this organization
      const ticketNumber = await this.counterRepo.getNextTicketNumber(organizationId, client);

      // 2. Insert ticket
      const ticket = await this.ticketRepo.create(
        {
          organizationId,
          ticketNumber,
          subject: input.subject,
          description: input.description,
          category: input.category,
          priority: input.priority || 'medium',
          createdByUserId: actorUserId,
        },
        client
      );

      // 3. Log ticket.created activity record
      await this.activityRepo.logActivity(
        {
          organizationId,
          ticketId: ticket.id,
          actorUserId,
          action: 'ticket.created',
          newValues: {
            ticket_number: ticketNumber,
            subject: input.subject,
            category: input.category,
            priority: input.priority || 'medium',
            status: 'open',
          },
          metadata: {
            formattedTicketNumber: this.counterRepo.formatTicketNumber(ticketNumber),
          },
        },
        client
      );

      await client.query('COMMIT');

      // Fetch created ticket with joined creator details
      const createdWithUser = await this.ticketRepo.findById(organizationId, ticket.id);

      return this.ticketRepo.toSafeTicket(
        createdWithUser || {
          ...ticket,
          creator_name: 'You',
          creator_email: '',
        }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Lists tickets with pagination, filters, and SQL-enforced role visibility.
   */
  async listTickets(
    organizationId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    query: TicketQueryInput
  ): Promise<{
    tickets: SafeTicket[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { tickets, total } = await this.ticketRepo.list(
      organizationId,
      query,
      actorRole,
      actorUserId
    );

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      tickets: tickets.map(t => this.ticketRepo.toSafeTicket(t)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieves single ticket details if caller is authorized.
   */
  async getTicketDetails(
    organizationId: string,
    ticketId: string,
    actorUserId: string,
    actorRole: OrganizationRole
  ): Promise<SafeTicket> {
    const ticket = await this.ticketRepo.findById(organizationId, ticketId);
    if (!ticket) {
      throw new Error('TICKET_NOT_FOUND');
    }

    if (!canViewTicket(actorRole, actorUserId, ticket)) {
      // 404 to avoid leaking existence of private tickets
      throw new Error('TICKET_NOT_FOUND');
    }

    return this.ticketRepo.toSafeTicket(ticket);
  }

  /**
   * Updates ticket subject, description, or category.
   */
  async updateTicket(
    organizationId: string,
    ticketId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    input: UpdateTicketInput
  ): Promise<SafeTicket> {
    const ticket = await this.ticketRepo.findById(organizationId, ticketId);
    if (!ticket) {
      throw new Error('TICKET_NOT_FOUND');
    }

    if (!canViewTicket(actorRole, actorUserId, ticket)) {
      throw new Error('TICKET_NOT_FOUND');
    }

    if (!canUpdateTicket(actorRole, actorUserId, ticket)) {
      throw new Error(
        'FORBIDDEN_CANNOT_UPDATE_TICKET: Only open unassigned tickets may be edited by their creator, or by an admin/owner'
      );
    }

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const lockedTicket = await this.ticketRepo.findByIdForUpdate(
        organizationId,
        ticketId,
        client
      );

      if (!lockedTicket) {
        throw new Error('TICKET_NOT_FOUND');
      }

      const updated = await this.ticketRepo.updateDetails(organizationId, ticketId, input, client);

      await this.activityRepo.logActivity(
        {
          organizationId,
          ticketId,
          actorUserId,
          action: 'ticket.updated',
          oldValues: {
            subject: ticket.subject,
            description: ticket.description,
            category: ticket.category,
          },
          newValues: {
            subject: updated.subject,
            description: updated.description,
            category: updated.category,
          },
        },
        client
      );

      await client.query('COMMIT');

      const refreshed = await this.ticketRepo.findById(organizationId, ticketId);
      return this.ticketRepo.toSafeTicket(
        refreshed || {
          ...updated,
          creator_name: ticket.creator_name,
          creator_email: ticket.creator_email,
          assignee_name: ticket.assignee_name,
          assignee_email: ticket.assignee_email,
        }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Updates ticket priority (owner/admin only).
   */
  async updatePriority(
    organizationId: string,
    ticketId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    priority: TicketPriority
  ): Promise<SafeTicket> {
    if (!canChangeTicketPriority(actorRole)) {
      throw new Error(
        'FORBIDDEN_CANNOT_CHANGE_PRIORITY: Only owner or admin may change ticket priority'
      );
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

      const previousPriority = ticket.priority;

      await this.ticketRepo.updatePriority(organizationId, ticketId, priority, client);

      await this.activityRepo.logActivity(
        {
          organizationId,
          ticketId,
          actorUserId,
          action: 'ticket.priority_changed',
          oldValues: { priority: previousPriority },
          newValues: { priority },
        },
        client
      );

      await client.query('COMMIT');

      const refreshed = await this.ticketRepo.findById(organizationId, ticketId);
      return this.ticketRepo.toSafeTicket(refreshed!);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft archives a ticket (owner/admin only).
   */
  async archiveTicket(
    organizationId: string,
    ticketId: string,
    actorUserId: string,
    actorRole: OrganizationRole
  ): Promise<SafeTicket> {
    if (!canArchiveTicket(actorRole)) {
      throw new Error('FORBIDDEN_CANNOT_ARCHIVE_TICKET: Only owner or admin may archive tickets');
    }

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const ticket = await this.ticketRepo.findByIdForUpdate(organizationId, ticketId, client);

      if (!ticket) {
        throw new Error('TICKET_NOT_FOUND');
      }

      await this.ticketRepo.archive(organizationId, ticketId, client);

      await this.activityRepo.logActivity(
        {
          organizationId,
          ticketId,
          actorUserId,
          action: 'ticket.archived',
        },
        client
      );

      await client.query('COMMIT');

      const refreshed = await this.ticketRepo.findById(organizationId, ticketId);
      return this.ticketRepo.toSafeTicket(refreshed!);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Returns dashboard summary metric counts scoped to user's permitted ticket visibility.
   */
  async getSummary(
    organizationId: string,
    actorUserId: string,
    actorRole: OrganizationRole
  ): Promise<TicketSummaryMetrics> {
    return this.ticketRepo.getSummaryMetrics(organizationId, actorRole, actorUserId);
  }
}

export const ticketService = new TicketService();
