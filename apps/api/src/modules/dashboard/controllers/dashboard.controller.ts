import type { Request, Response, NextFunction } from 'express';
import { dashboardService, DashboardService } from '../services/dashboard.service.js';

export class DashboardController {
  constructor(private service: DashboardService = dashboardService) {}

  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { period, from, to } = req.query as {
        period?: string;
        from?: string;
        to?: string;
      };

      const overview = await this.service.getDashboardOverview({
        organizationId,
        period,
        from,
        to,
      });

      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const offset = parseInt(req.query.offset as string, 10) || 0;

      const items = await this.service.getRecentActivityFeed(organizationId, limit, offset);

      res.status(200).json({
        success: true,
        data: {
          items,
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
