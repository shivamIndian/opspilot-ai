import { Router } from 'express';
import { organizationController } from '../controllers/organization.controller.js';
import { memberController } from '../controllers/member.controller.js';
import { invitationController } from '../controllers/invitation.controller.js';
import { ticketRouter } from '../../tickets/routes/ticket.routes.js';
import { documentRouter } from '../../documents/routes/document.routes.js';
import { knowledgeRouter } from '../../knowledge/routes/knowledge.routes.js';
import { workflowRouter } from '../../agent-workflows/index.js';
import { agentApprovalRouter } from '../../agent-approvals/routes/agent-approval.routes.js';
import { agentMemoryRouter, agentMemorySettingsRouter } from '../../agent-memory/index.js';
import { agentMonitoringRouter } from '../../agent-monitoring/index.js';
import { aiEvaluationRouter } from '../../ai-evaluation/index.js';
import { dashboardRouter } from '../../dashboard/index.js';
import { conversationRouter } from '../../conversations/index.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';
import {
  requireOrganizationContext,
  requireOrgPermission,
  requireOrgRole,
} from '../middleware/organization-context.middleware.js';

export const organizationRouter = Router();

// Global organization routes (caller must be authenticated)
organizationRouter.use(requireAuthentication);

organizationRouter.post('/', (req, res, next) => organizationController.create(req, res, next));
organizationRouter.get('/', (req, res, next) => organizationController.list(req, res, next));

// Organization Context Scoped Routes (requires active membership in :organizationId)
organizationRouter.get('/:organizationId', requireOrganizationContext, (req, res, next) =>
  organizationController.getDetails(req, res, next)
);

organizationRouter.patch(
  '/:organizationId',
  requireOrganizationContext,
  requireOrgPermission('organization:update'),
  (req, res, next) => organizationController.update(req, res, next)
);

organizationRouter.post(
  '/:organizationId/archive',
  requireOrganizationContext,
  requireOrgRole('owner'),
  (req, res, next) => organizationController.archive(req, res, next)
);

organizationRouter.get(
  '/:organizationId/audit-logs',
  requireOrganizationContext,
  requireOrgRole('owner', 'admin'),
  (req, res, next) => organizationController.getAuditLogs(req, res, next)
);

// Members routes
organizationRouter.get(
  '/:organizationId/members',
  requireOrganizationContext,
  requireOrgPermission('members:list'),
  (req, res, next) => memberController.listMembers(req, res, next)
);

organizationRouter.patch(
  '/:organizationId/members/:memberId/role',
  requireOrganizationContext,
  requireOrgPermission('members:role_update'),
  (req, res, next) => memberController.updateRole(req, res, next)
);

organizationRouter.delete(
  '/:organizationId/members/:memberId',
  requireOrganizationContext,
  requireOrgPermission('members:remove'),
  (req, res, next) => memberController.removeMember(req, res, next)
);

organizationRouter.post('/:organizationId/leave', requireOrganizationContext, (req, res, next) =>
  memberController.leave(req, res, next)
);

organizationRouter.post(
  '/:organizationId/transfer-ownership',
  requireOrganizationContext,
  requireOrgRole('owner'),
  (req, res, next) => memberController.transferOwnership(req, res, next)
);

// Invitations routes
organizationRouter.post(
  '/:organizationId/invitations',
  requireOrganizationContext,
  requireOrgPermission('invitations:create'),
  (req, res, next) => invitationController.create(req, res, next)
);

organizationRouter.get(
  '/:organizationId/invitations',
  requireOrganizationContext,
  requireOrgPermission('invitations:list'),
  (req, res, next) => invitationController.list(req, res, next)
);

organizationRouter.post(
  '/:organizationId/invitations/:invitationId/resend',
  requireOrganizationContext,
  requireOrgPermission('invitations:resend'),
  (req, res, next) => invitationController.resend(req, res, next)
);

organizationRouter.delete(
  '/:organizationId/invitations/:invitationId',
  requireOrganizationContext,
  requireOrgPermission('invitations:revoke'),
  (req, res, next) => invitationController.revoke(req, res, next)
);

// Mount Ticket System routes for this organization
organizationRouter.use('/:organizationId/tickets', ticketRouter);

// Mount Document Management System routes for this organization
organizationRouter.use('/:organizationId/documents', documentRouter);

// Mount Knowledge Search / RAG Retrieval routes for this organization
organizationRouter.use('/:organizationId/knowledge', knowledgeRouter);

// Mount Agent Workflow Engine routes for this organization
organizationRouter.use('/:organizationId/agent/workflows', workflowRouter);

// Mount Agent Approval Dashboard routes for this organization
organizationRouter.use('/:organizationId/agent/approvals', agentApprovalRouter);

// Mount Agent Monitoring & Observability routes for this organization
organizationRouter.use('/:organizationId/agent-monitoring', agentMonitoringRouter);
organizationRouter.use('/:organizationId/agent/monitoring', agentMonitoringRouter);

// Mount AI Evaluation routes for this organization
organizationRouter.use('/:organizationId/ai-evaluation', aiEvaluationRouter);

// Mount Agent Memory & Preferences routes for this organization
organizationRouter.use('/:organizationId/agent/memories', agentMemoryRouter);
organizationRouter.use('/:organizationId/agent/memory-settings', agentMemorySettingsRouter);

// Mount Admin Dashboard routes for this organization
organizationRouter.use('/:organizationId/dashboard', dashboardRouter);

// Mount AI Chat Conversations routes for this organization
organizationRouter.use('/:organizationId/conversations', conversationRouter);
