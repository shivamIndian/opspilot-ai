import type { Request, Response, NextFunction } from 'express';
import { agentMonitoringService } from '../services/agent-monitoring.service.js';

export class AgentMonitoringController {
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };

      const overview = await agentMonitoringService.getOverview(
        organizationId,
        fromDate,
        toDate
      );

      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  }

  async listRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const {
        status,
        workflowName,
        search,
        fromDate,
        toDate,
        page = '1',
        limit = '20',
      } = req.query as {
        status?: string;
        workflowName?: string;
        search?: string;
        fromDate?: string;
        toDate?: string;
        page?: string;
        limit?: string;
      };

      const result = await agentMonitoringService.listRuns({
        organizationId,
        status: status && status !== 'all' ? status : undefined,
        workflowName,
        search,
        fromDate,
        toDate,
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRunDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId, runId } = req.params;

      const details = await agentMonitoringService.getRunDetails(organizationId, runId);

      res.status(200).json({
        success: true,
        data: details,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRunEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId, runId } = req.params;

      const events = await agentMonitoringService.getRunEvents(organizationId, runId);

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  async getToolExecutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;

      const summaries = await agentMonitoringService.getToolExecutions(organizationId);

      res.status(200).json({
        success: true,
        data: summaries,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const agentMonitoringController = new AgentMonitoringController();
