import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { workflowService, WorkflowService } from '../services/workflow.service.js';
import { runWorkflowSchema, getWorkflowParamsSchema } from '../validators/workflow.schema.js';
import { AiWorkflowClientError } from '../client/ai-workflow.client.js';

export class WorkflowController {
  constructor(private service: WorkflowService = workflowService) {}

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const userId = req.user!.id;
      const userRole = req.organization!.role;

      const body = runWorkflowSchema.parse(req.body);

      const result = await this.service.runWorkflow({
        organizationId,
        userId,
        userRole,
        query: body.query,
        workflowVersion: body.workflowVersion,
        threadId: body.threadId,
        correlationId: body.correlationId,
      });

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
            message: error.errors[0]?.message || 'Invalid workflow execution input',
            details: error.errors,
          },
        });
        return;
      }

      if (error instanceof AiWorkflowClientError) {
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
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.organization!.id;
      const userId = req.user!.id;

      const params = getWorkflowParamsSchema.parse({
        organizationId,
        runId: req.params.runId,
      });

      const result = await this.service.getWorkflowStatus(
        params.organizationId,
        userId,
        params.runId
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
            message: error.errors[0]?.message || 'Invalid request parameters',
            details: error.errors,
          },
        });
        return;
      }

      if (error instanceof AiWorkflowClientError) {
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
  }
}

export const workflowController = new WorkflowController();
