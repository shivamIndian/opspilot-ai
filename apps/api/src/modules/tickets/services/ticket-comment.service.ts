import type { Pool } from 'pg';
import { pool } from '../../../database/index.js';
import {
  ticketCommentRepository,
  TicketCommentRepository,
} from '../repositories/ticket-comment.repository.js';
import { ticketRepository, TicketRepository } from '../repositories/ticket.repository.js';
import {
  ticketActivityRepository,
  TicketActivityRepository,
} from '../repositories/ticket-activity.repository.js';
import {
  canViewTicket,
  canCreateInternalNote,
  canViewInternalNotes,
} from '../permissions/ticket-permissions.js';
import type { OrganizationRole } from '../../organizations/types/organization.types.js';
import type { CommentVisibility, SafeTicketComment } from '../types/ticket.types.js';

export class TicketCommentService {
  constructor(
    private db: Pool = pool,
    private commentRepo: TicketCommentRepository = ticketCommentRepository,
    private ticketRepo: TicketRepository = ticketRepository,
    private activityRepo: TicketActivityRepository = ticketActivityRepository
  ) {}

  /**
   * Adds a public comment or internal note to a ticket within a transaction.
   */
  async addComment(
    organizationId: string,
    ticketId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    body: string,
    visibility: CommentVisibility = 'public'
  ): Promise<SafeTicketComment> {
    const ticket = await this.ticketRepo.findById(organizationId, ticketId);
    if (!ticket) {
      throw new Error('TICKET_NOT_FOUND');
    }

    if (!canViewTicket(actorRole, actorUserId, ticket)) {
      throw new Error('TICKET_NOT_FOUND');
    }

    if (ticket.archived_at !== null) {
      throw new Error('CANNOT_MODIFY_ARCHIVED_TICKET');
    }

    // Role check for internal notes
    if (visibility === 'internal' && !canCreateInternalNote(actorRole)) {
      throw new Error(
        'FORBIDDEN_CANNOT_CREATE_INTERNAL_NOTE: Only owner or admin may create internal notes'
      );
    }

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const comment = await this.commentRepo.create(
        {
          organizationId,
          ticketId,
          authorUserId: actorUserId,
          body,
          visibility,
        },
        client
      );

      // Log activity
      await this.activityRepo.logActivity(
        {
          organizationId,
          ticketId,
          actorUserId,
          action: 'ticket.comment_added',
          metadata: {
            commentId: comment.id,
            visibility,
          },
        },
        client
      );

      await client.query('COMMIT');

      // Fetch with author info
      const { comments } = await this.commentRepo.listByTicket(
        organizationId,
        ticketId,
        true,
        1,
        0
      );
      const inserted = comments.find(c => c.id === comment.id);

      return this.commentRepo.toSafeComment(
        inserted || {
          ...comment,
          author_name: 'You',
          author_email: '',
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
   * Retrieves comments for a ticket. Internal notes are excluded if the caller is a standard member.
   */
  async listComments(
    organizationId: string,
    ticketId: string,
    actorUserId: string,
    actorRole: OrganizationRole,
    limit = 50,
    offset = 0
  ): Promise<{ comments: SafeTicketComment[]; total: number }> {
    const ticket = await this.ticketRepo.findById(organizationId, ticketId);
    if (!ticket) {
      throw new Error('TICKET_NOT_FOUND');
    }

    if (!canViewTicket(actorRole, actorUserId, ticket)) {
      throw new Error('TICKET_NOT_FOUND');
    }

    const includeInternal = canViewInternalNotes(actorRole);

    const { comments, total } = await this.commentRepo.listByTicket(
      organizationId,
      ticketId,
      includeInternal,
      limit,
      offset
    );

    return {
      total,
      comments: comments.map(c => this.commentRepo.toSafeComment(c)),
    };
  }
}

export const ticketCommentService = new TicketCommentService();
