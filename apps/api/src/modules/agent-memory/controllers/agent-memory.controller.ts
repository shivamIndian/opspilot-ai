import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  agentMemoryService,
  AgentMemoryService,
  AgentMemoryPrivacyError,
} from '../services/agent-memory.service.js';
import { AiMemoryClientError } from '../client/ai-memory.client.js';

export class AgentMemoryController {
  constructor(private service: AgentMemoryService = agentMemoryService) {}

  private handleError(error: unknown, res: Response, next: NextFunction): void {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0]?.message || 'Invalid input parameters',
          details: error.errors,
        },
      });
      return;
    }

    if (error instanceof AgentMemoryPrivacyError) {
      res.status(error.status).json({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      });
      return;
    }

    if (error instanceof AiMemoryClientError) {
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    next(error);
  }

  async listMemories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const requesterUserId = req.user!.id;
      const targetUserId = (req.query.user_id as string) || requesterUserId;

      const { memory_type, status, limit, offset } = req.query;

      const result = await this.service.listMemories(organizationId, requesterUserId, targetUserId, {
        memory_type: memory_type ? String(memory_type) : undefined,
        status: status ? String(status) : undefined,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async createMemory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const requesterUserId = req.user!.id;
      const targetUserId = (req.query.user_id as string) || requesterUserId;

      const result = await this.service.createMemory(
        organizationId,
        requesterUserId,
        targetUserId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async getMemory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const requesterUserId = req.user!.id;
      const targetUserId = (req.query.user_id as string) || requesterUserId;
      const { memoryId } = req.params;

      const result = await this.service.getMemory(
        organizationId,
        requesterUserId,
        targetUserId,
        memoryId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async updateMemory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const requesterUserId = req.user!.id;
      const targetUserId = (req.query.user_id as string) || requesterUserId;
      const { memoryId } = req.params;

      const result = await this.service.updateMemory(
        organizationId,
        requesterUserId,
        targetUserId,
        memoryId,
        req.body
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async deleteMemory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const requesterUserId = req.user!.id;
      const targetUserId = (req.query.user_id as string) || requesterUserId;
      const { memoryId } = req.params;

      const result = await this.service.deleteMemory(
        organizationId,
        requesterUserId,
        targetUserId,
        memoryId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async bulkPurgeMemories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const requesterUserId = req.user!.id;
      const targetUserId = (req.query.user_id as string) || requesterUserId;

      const result = await this.service.bulkPurgeMemories(
        organizationId,
        requesterUserId,
        targetUserId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const requesterUserId = req.user!.id;
      const targetUserId = (req.query.user_id as string) || requesterUserId;

      const result = await this.service.getSettings(organizationId, requesterUserId, targetUserId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const requesterUserId = req.user!.id;
      const targetUserId = (req.query.user_id as string) || requesterUserId;

      const result = await this.service.updateSettings(
        organizationId,
        requesterUserId,
        targetUserId,
        req.body
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async searchMemories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const requesterUserId = req.user!.id;
      const targetUserId = (req.query.user_id as string) || requesterUserId;
      const { query, memory_type, top_k, similarity_threshold } = req.body;

      const result = await this.service.searchMemories(
        organizationId,
        requesterUserId,
        targetUserId,
        query,
        {
          memory_type,
          top_k,
          similarity_threshold,
        }
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async extractSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const requesterUserId = req.user!.id;
      const targetUserId = (req.query.user_id as string) || requesterUserId;
      const { conversation_id, messages, workflow_context } = req.body;

      const result = await this.service.extractSuggestions(
        organizationId,
        requesterUserId,
        targetUserId,
        conversation_id,
        messages,
        workflow_context
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }
}

export const agentMemoryController = new AgentMemoryController();
