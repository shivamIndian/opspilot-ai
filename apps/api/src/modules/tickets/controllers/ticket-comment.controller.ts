import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ticketCommentService, TicketCommentService } from '../services/ticket-comment.service.js';
import { createCommentSchema } from '../validators/ticket.schema.js';

export class TicketCommentController {
  constructor(private commentService: TicketCommentService = ticketCommentService) {}

  async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.ticketId;
      const parsed = createCommentSchema.parse(req.body);

      const comment = await this.commentService.addComment(
        req.organization!.id,
        ticketId,
        req.user!.id,
        req.organization!.role,
        parsed.body,
        parsed.visibility || 'public'
      );

      res.status(201).json({
        success: true,
        data: { comment },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid comment input',
            details: error.errors,
          },
        });
        return;
      }
      if (error instanceof Error) {
        if (error.message === 'TICKET_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found' },
          });
          return;
        }
        if (error.message.startsWith('FORBIDDEN_')) {
          res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN_COMMENT', message: error.message },
          });
          return;
        }
      }
      next(error);
    }
  }

  async listComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.ticketId;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const offset = parseInt(req.query.offset as string, 10) || 0;

      const result = await this.commentService.listComments(
        req.organization!.id,
        ticketId,
        req.user!.id,
        req.organization!.role,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'TICKET_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found' },
        });
        return;
      }
      next(error);
    }
  }
}

export const ticketCommentController = new TicketCommentController();
