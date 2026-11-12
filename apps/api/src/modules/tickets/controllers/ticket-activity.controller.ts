import type { Request, Response, NextFunction } from 'express';
import {
  ticketActivityService,
  TicketActivityService,
} from '../services/ticket-activity.service.js';
import { ticketRepository, TicketRepository } from '../repositories/ticket.repository.js';
import { canViewTicket } from '../permissions/ticket-permissions.js';

export class TicketActivityController {
  constructor(
    private activityService: TicketActivityService = ticketActivityService,
    private ticketRepo: TicketRepository = ticketRepository
  ) {}

  async listActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.ticketId;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const offset = parseInt(req.query.offset as string, 10) || 0;

      // Verify access to ticket
      const ticket = await this.ticketRepo.findById(req.organization!.id, ticketId);
      if (!ticket) {
        res.status(404).json({
          success: false,
          error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found' },
        });
        return;
      }

      if (!canViewTicket(req.organization!.role, req.user!.id, ticket)) {
        res.status(404).json({
          success: false,
          error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found' },
        });
        return;
      }

      const result = await this.activityService.listTicketActivity(
        req.organization!.id,
        ticketId,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const ticketActivityController = new TicketActivityController();
