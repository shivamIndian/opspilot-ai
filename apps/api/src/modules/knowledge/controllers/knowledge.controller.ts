import type { Request, Response, NextFunction } from 'express';
import { knowledgeSearchSchema, knowledgeAnswerSchema } from '../validators/knowledge.schema.js';
import {
  knowledgeRetrievalService,
  KnowledgeRetrievalService,
} from '../services/knowledge-retrieval.service.js';
import {
  knowledgeAnswerService,
  KnowledgeAnswerService,
} from '../services/knowledge-answer.service.js';
import { AiRetrievalClientError } from '../client/ai-retrieval.client.js';
import { AiLlmClientError } from '../client/ai-llm.client.js';

export class KnowledgeController {
  private retrievalService: KnowledgeRetrievalService;
  private answerService: KnowledgeAnswerService;

  constructor(
    retrievalService: KnowledgeRetrievalService = knowledgeRetrievalService,
    answerService: KnowledgeAnswerService = knowledgeAnswerService
  ) {
    this.retrievalService = retrievalService;
    this.answerService = answerService;
  }

  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const parsedBody = knowledgeSearchSchema.parse(req.body);

      const result = await this.retrievalService.search(organizationId, parsedBody);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: unknown) {
      if (err instanceof AiRetrievalClientError) {
        res.status(err.status || 500).json({
          success: false,
          error: {
            code: err.errorCode,
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  }

  async generateAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const parsedBody = knowledgeAnswerSchema.parse(req.body);

      const result = await this.answerService.generateAnswer(organizationId, parsedBody);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: unknown) {
      if (err instanceof AiLlmClientError) {
        res.status(err.status || 500).json({
          success: false,
          error: {
            code: err.errorCode,
            message: err.message,
          },
        });
        return;
      }
      if (err instanceof AiRetrievalClientError) {
        res.status(err.status || 500).json({
          success: false,
          error: {
            code: err.errorCode,
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  }
}

export const knowledgeController = new KnowledgeController();
