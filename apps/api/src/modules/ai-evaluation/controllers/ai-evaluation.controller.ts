import type { Request, Response, NextFunction } from 'express';
import { aiEvaluationService } from '../services/ai-evaluation.service.js';

export class AiEvaluationController {
  async listDatasets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const datasets = await aiEvaluationService.listDatasets(organizationId);
      res.status(200).json({ success: true, data: datasets });
    } catch (error) {
      next(error);
    }
  }

  async createDataset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const dataset = await aiEvaluationService.createDataset(organizationId, req.body);
      res.status(201).json({ success: true, data: dataset });
    } catch (error) {
      next(error);
    }
  }

  async getDataset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId, datasetId } = req.params;
      const data = await aiEvaluationService.getDataset(organizationId, datasetId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async addExamples(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId, datasetId } = req.params;
      const examples = await aiEvaluationService.addExamples(organizationId, datasetId, req.body);
      res.status(201).json({ success: true, data: examples });
    } catch (error) {
      next(error);
    }
  }

  async startRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const run = await aiEvaluationService.startRun(organizationId, req.body);
      res.status(201).json({ success: true, data: run });
    } catch (error) {
      next(error);
    }
  }

  async listRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const runs = await aiEvaluationService.listRuns(organizationId);
      res.status(200).json({ success: true, data: runs });
    } catch (error) {
      next(error);
    }
  }

  async getRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId, runId } = req.params;
      const run = await aiEvaluationService.getRun(organizationId, runId);
      res.status(200).json({ success: true, data: run });
    } catch (error) {
      next(error);
    }
  }

  async getRunResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId, runId } = req.params;
      const results = await aiEvaluationService.getRunResults(organizationId, runId);
      res.status(200).json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }

  async compareRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { runIdA, runIdB } = req.query as { runIdA: string; runIdB: string };

      if (!runIdA || !runIdB) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COMPARISON_PARAMETERS',
            message: 'Both runIdA and runIdB query parameters are required',
          },
        });
        return;
      }

      const comparison = await aiEvaluationService.compareRuns(organizationId, runIdA, runIdB);
      res.status(200).json({ success: true, data: comparison });
    } catch (error) {
      next(error);
    }
  }
}

export const aiEvaluationController = new AiEvaluationController();
