import { Router } from 'express';
import { rootRouter } from './rootRoutes.js';
import { healthRouter } from './healthRoutes.js';
import { authRouter } from '../modules/auth/index.js';
import { organizationRouter, invitationRouter } from '../modules/organizations/index.js';
import { agentToolsRouter } from '../modules/agent-tools/index.js';
import { agentApprovalController } from '../modules/agent-approvals/controllers/agent-approval.controller.js';

export const apiRouter = Router();

// Mount root routes
apiRouter.use('/', rootRouter);

// Mount versioned API routes
apiRouter.use('/api/v1', healthRouter);
apiRouter.use('/api/v1/auth', authRouter);
apiRouter.use('/api/v1/organizations', organizationRouter);
apiRouter.use('/api/v1/invitations', invitationRouter);

// Mount internal agent tool gateway routes
apiRouter.use('/internal/v1/agent-tools', agentToolsRouter);

// Mount internal agent proposal execution gateway route
apiRouter.post('/internal/v1/agent-proposals/:proposalId/execute', (req, res, next) =>
  agentApprovalController.executeProposal(req, res, next)
);
