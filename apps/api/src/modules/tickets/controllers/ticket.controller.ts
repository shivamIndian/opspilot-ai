import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ticketService, TicketService } from '../services/ticket.service.js';
import {
  ticketAssignmentService,
  TicketAssignmentService,
} from '../services/ticket-assignment.service.js';
import {
  ticketWorkflowService,
  TicketWorkflowService,
} from '../services/ticket-workflow.service.js';
import {
  createTicketSchema,
  updateTicketSchema,
  assignTicketSchema,
  updatePrioritySchema,
  updateStatusSchema,
  ticketQuerySchema,
} from '../validators/ticket.schema.js';

export class TicketController {
  constructor(
    private tService: TicketService = ticketService,
    private assignmentService: TicketAssignmentService = ticketAssignmentService,
    private workflowService: TicketWorkflowService = ticketWorkflowService
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createTicketSchema.parse(req.body);
      const ticket = await this.tService.createTicket(req.organization!.id, req.user!.id, parsed);

      res.status(201).json({
        success: true,
        data: { ticket },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid input data',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ticketQuerySchema.parse(req.query);
      const result = await this.tService.listTickets(
        req.organization!.id,
        req.user!.id,
        req.organization!.role,
        query
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid query parameters',
          },
        });
        return;
      }
      next(error);
    }
  }

  async getDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.ticketId;
      const ticket = await this.tService.getTicketDetails(
        req.organization!.id,
        ticketId,
        req.user!.id,
        req.organization!.role
      );

      res.status(200).json({
        success: true,
        data: { ticket },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'TICKET_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Ticket not found or inaccessible',
          },
        });
        return;
      }
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.ticketId;
      const parsed = updateTicketSchema.parse(req.body);

      const ticket = await this.tService.updateTicket(
        req.organization!.id,
        ticketId,
        req.user!.id,
        req.organization!.role,
        parsed
      );

      res.status(200).json({
        success: true,
        data: { ticket },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid update parameters',
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
            error: { code: 'FORBIDDEN_UPDATE', message: error.message },
          });
          return;
        }
      }
      next(error);
    }
  }

  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.ticketId;
      const parsed = assignTicketSchema.parse(req.body);

      const targetUserId = parsed.assignedToUserId ?? null;

      const ticket = await this.assignmentService.assignTicket(
        req.organization!.id,
        ticketId,
        req.user!.id,
        req.organization!.role,
        targetUserId
      );

      res.status(200).json({
        success: true,
        data: { ticket },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid assignment data',
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
            error: { code: 'FORBIDDEN_ASSIGNMENT', message: error.message },
          });
          return;
        }
        if (error.message.startsWith('ASSIGNEE_NOT_ACTIVE_MEMBER')) {
          res.status(400).json({
            success: false,
            error: { code: 'ASSIGNEE_NOT_ACTIVE_MEMBER', message: error.message },
          });
          return;
        }
      }
      next(error);
    }
  }

  async updatePriority(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.ticketId;
      const parsed = updatePrioritySchema.parse(req.body);

      const ticket = await this.tService.updatePriority(
        req.organization!.id,
        ticketId,
        req.user!.id,
        req.organization!.role,
        parsed.priority
      );

      res.status(200).json({
        success: true,
        data: { ticket },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid priority',
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
            error: { code: 'FORBIDDEN_PRIORITY', message: error.message },
          });
          return;
        }
      }
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.ticketId;
      const parsed = updateStatusSchema.parse(req.body);

      const ticket = await this.workflowService.transitionStatus(
        req.organization!.id,
        ticketId,
        req.user!.id,
        req.organization!.role,
        parsed.status
      );

      res.status(200).json({
        success: true,
        data: { ticket },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid status',
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
        if (error.message.startsWith('INVALID_STATUS_TRANSITION')) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_STATUS_TRANSITION', message: error.message },
          });
          return;
        }
        if (error.message.startsWith('FORBIDDEN_')) {
          res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN_STATUS_TRANSITION', message: error.message },
          });
          return;
        }
      }
      next(error);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.ticketId;
      const ticket = await this.tService.archiveTicket(
        req.organization!.id,
        ticketId,
        req.user!.id,
        req.organization!.role
      );

      res.status(200).json({
        success: true,
        data: { ticket },
        message: 'Ticket archived successfully',
      });
    } catch (error) {
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
            error: { code: 'FORBIDDEN_ARCHIVE', message: error.message },
          });
          return;
        }
      }
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await this.tService.getSummary(
        req.organization!.id,
        req.user!.id,
        req.organization!.role
      );

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const ticketController = new TicketController();
