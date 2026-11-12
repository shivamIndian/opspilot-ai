import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';
import {
  requireOrganizationContext,
  requireOrgPermission,
} from '../../organizations/middleware/organization-context.middleware.js';

export const dashboardRouter = Router({ mergeParams: true });

// All dashboard endpoints require authentication and active organization membership
dashboardRouter.use(requireAuthentication);
dashboardRouter.use(requireOrganizationContext);

// Overview metrics for organization dashboard
dashboardRouter.get('/overview', requireOrgPermission('dashboard:read'), (req, res, next) =>
  dashboardController.getOverview(req, res, next)
);

// Paginated activity feed
dashboardRouter.get('/recent-activity', requireOrgPermission('dashboard:read'), (req, res, next) =>
  dashboardController.getRecentActivity(req, res, next)
);
