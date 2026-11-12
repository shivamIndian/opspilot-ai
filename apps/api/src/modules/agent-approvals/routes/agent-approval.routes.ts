import { Router } from 'express';
import { agentApprovalController } from '../controllers/agent-approval.controller.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';
import {
  requireOrganizationContext,
  requireOrgPermission,
} from '../../organizations/middleware/organization-context.middleware.js';

export const agentApprovalRouter = Router({ mergeParams: true });

// All public agent approval routes require authentication and organization context
agentApprovalRouter.use(requireAuthentication);
agentApprovalRouter.use(requireOrganizationContext);

// GET /api/v1/organizations/:organizationId/agent/approvals
agentApprovalRouter.get('/', (req, res, next) => agentApprovalController.listProposals(req, res, next));

// GET /api/v1/organizations/:organizationId/agent/approvals/:proposalId
agentApprovalRouter.get('/:proposalId', (req, res, next) =>
  agentApprovalController.getProposalDetails(req, res, next)
);

// POST /api/v1/organizations/:organizationId/agent/approvals/:proposalId/approve
agentApprovalRouter.post(
  '/:proposalId/approve',
  requireOrgPermission('agent:approve'),
  (req, res, next) => agentApprovalController.approveProposal(req, res, next)
);

// POST /api/v1/organizations/:organizationId/agent/approvals/:proposalId/reject
agentApprovalRouter.post(
  '/:proposalId/reject',
  requireOrgPermission('agent:approve'),
  (req, res, next) => agentApprovalController.rejectProposal(req, res, next)
);

// POST /api/v1/organizations/:organizationId/agent/approvals/:proposalId/cancel
agentApprovalRouter.post('/:proposalId/cancel', (req, res, next) =>
  agentApprovalController.cancelProposal(req, res, next)
);
