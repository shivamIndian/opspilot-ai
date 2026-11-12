import type { Response, NextFunction } from 'express';
import { agentToolsService } from '../services/agent-tools.service.js';
import type { AuthenticatedToolRequest } from '../types/agent-tools.types.js';

export class AgentToolsController {
  async searchKnowledge(
    req: AuthenticatedToolRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.toolContext!;
      const data = await agentToolsService.searchKnowledge(organizationId, req.body);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getTicket(req: AuthenticatedToolRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId, userId, membership } = req.toolContext!;
      const ticketId = req.body.ticketId || req.body.ticket_id;
      if (!ticketId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'ticketId parameter is required' },
        });
        return;
      }
      const data = await agentToolsService.getTicket(
        organizationId,
        userId,
        membership.role,
        ticketId
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createTicketProposal(
    req: AuthenticatedToolRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, userId } = req.toolContext!;
      const data = await agentToolsService.createTicketProposal(organizationId, userId, req.body);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateTicketProposal(
    req: AuthenticatedToolRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, userId } = req.toolContext!;
      const data = await agentToolsService.updateTicketProposal(organizationId, userId, req.body);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(
    req: AuthenticatedToolRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId } = req.toolContext!;
      const data = await agentToolsService.searchUsers(organizationId, req.body);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async summarizeSupportHistory(
    req: AuthenticatedToolRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { organizationId, userId, membership } = req.toolContext!;
      const data = await agentToolsService.summarizeSupportHistory(
        organizationId,
        userId,
        membership.role,
        req.body
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const agentToolsController = new AgentToolsController();
