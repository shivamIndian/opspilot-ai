import { Router } from 'express';
import { workflowController } from '../controllers/workflow.controller.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';
import { requireOrganizationContext } from '../../organizations/middleware/organization-context.middleware.js';
import { aiOperationsLimiter } from '../../../middleware/rate-limiter.js';

export const workflowRouter = Router({ mergeParams: true });

// All workflow routes require authentication and valid active organization membership
workflowRouter.use(requireAuthentication);
workflowRouter.use(requireOrganizationContext);

// POST /api/v1/organizations/:organizationId/agent/workflows/run
workflowRouter.post('/run', aiOperationsLimiter, (req, res, next) => workflowController.run(req, res, next));

// GET /api/v1/organizations/:organizationId/agent/workflows/:runId
workflowRouter.get('/:runId', (req, res, next) => workflowController.getStatus(req, res, next));
