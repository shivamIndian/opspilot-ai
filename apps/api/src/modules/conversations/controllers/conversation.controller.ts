import type { Request, Response, NextFunction } from 'express';
import { conversationService, ConversationService, ConversationServiceError } from '../services/conversation.service.js';

export class ConversationController {
  constructor(private service: ConversationService = conversationService) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const userId = req.user!.id;
      const userRole = req.organization!.role;
      const { title, initialMessage } = req.body;

      const result = await this.service.createConversation(organizationId, userId, userRole, {
        title,
        initialMessage,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const offset = parseInt(req.query.offset as string, 10) || 0;

      const conversations = await this.service.listConversations(
        organizationId,
        userId,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const userId = req.user!.id;
      const { conversationId } = req.params;

      const conversation = await this.service.getConversation(
        organizationId,
        userId,
        conversationId
      );

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const userId = req.user!.id;
      const { conversationId } = req.params;
      const { title } = req.body;

      const updated = await this.service.updateTitle(organizationId, userId, conversationId, title);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const userId = req.user!.id;
      const { conversationId } = req.params;

      await this.service.archiveConversation(organizationId, userId, conversationId);

      res.status(200).json({
        success: true,
        message: 'Conversation archived successfully',
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async listMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const userId = req.user!.id;
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string, 10) || 100;
      const offset = parseInt(req.query.offset as string, 10) || 0;

      const messages = await this.service.listMessages(
        organizationId,
        userId,
        conversationId,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const userId = req.user!.id;
      const userRole = req.organization!.role;
      const { conversationId } = req.params;
      const { content, workflowVersion, correlationId } = req.body;

      const result = await this.service.sendMessage(
        organizationId,
        userId,
        userRole,
        conversationId,
        { content, workflowVersion, correlationId }
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async streamMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const userId = req.user!.id;
      const userRole = req.organization!.role;
      const { conversationId } = req.params;
      const { content, workflowVersion, correlationId } = req.body;

      await this.service.streamMessage(
        organizationId,
        userId,
        userRole,
        conversationId,
        { content, workflowVersion, correlationId },
        res
      );
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  private handleError(error: unknown, res: Response, next: NextFunction): void {
    if (error instanceof ConversationServiceError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
}

export const conversationController = new ConversationController();
