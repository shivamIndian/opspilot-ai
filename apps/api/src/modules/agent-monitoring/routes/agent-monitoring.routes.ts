import { Router } from 'express';
import { agentMonitoringController } from '../controllers/agent-monitoring.controller.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';
import {
  requireOrganizationContext,
  requireOrgRole,
} from '../../organizations/middleware/organization-context.middleware.js';

export const agentMonitoringRouter = Router({ mergeParams: true });

// All agent monitoring routes require authentication, valid active organization membership, and owner/admin role
agentMonitoringRouter.use(requireAuthentication);
agentMonitoringRouter.use(requireOrganizationContext);
agentMonitoringRouter.use(requireOrgRole('owner', 'admin'));

// GET /api/v1/organizations/:organizationId/agent-monitoring/overview
agentMonitoringRouter.get('/overview', (req, res, next) =>
  agentMonitoringController.getOverview(req, res, next)
);

// GET /api/v1/organizations/:organizationId/agent-monitoring/runs
agentMonitoringRouter.get('/runs', (req, res, next) =>
  agentMonitoringController.listRuns(req, res, next)
);

// GET /api/v1/organizations/:organizationId/agent-monitoring/runs/:runId
agentMonitoringRouter.get('/runs/:runId', (req, res, next) =>
  agentMonitoringController.getRunDetails(req, res, next)
);

// GET /api/v1/organizations/:organizationId/agent-monitoring/runs/:runId/events
agentMonitoringRouter.get('/runs/:runId/events', (req, res, next) =>
  agentMonitoringController.getRunEvents(req, res, next)
);

// GET /api/v1/organizations/:organizationId/agent-monitoring/tool-executions
agentMonitoringRouter.get('/tool-executions', (req, res, next) =>
  agentMonitoringController.getToolExecutions(req, res, next)
);
