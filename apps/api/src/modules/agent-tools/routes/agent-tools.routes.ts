import { Router } from 'express';
import {
  delegatedToolAuthMiddleware,
  requireToolScope,
} from '../middleware/delegated-tool-auth.middleware.js';
import { agentToolsController } from '../controllers/agent-tools.controller.js';

const router = Router();

// Enforce service-to-service auth and delegated JWT verification across all endpoints
router.use(delegatedToolAuthMiddleware);

router.post(
  '/knowledge/search',
  requireToolScope('tools:knowledge:read'),
  agentToolsController.searchKnowledge.bind(agentToolsController)
);

router.post(
  '/tickets/get',
  requireToolScope('tools:tickets:read'),
  agentToolsController.getTicket.bind(agentToolsController)
);

router.post(
  '/tickets/create-proposal',
  requireToolScope('tools:tickets:write'),
  agentToolsController.createTicketProposal.bind(agentToolsController)
);

router.post(
  '/tickets/update-proposal',
  requireToolScope('tools:tickets:write'),
  agentToolsController.updateTicketProposal.bind(agentToolsController)
);

router.post(
  '/users/search',
  requireToolScope('tools:users:read'),
  agentToolsController.searchUsers.bind(agentToolsController)
);

router.post(
  '/support-history/search',
  requireToolScope('tools:history:read'),
  agentToolsController.summarizeSupportHistory.bind(agentToolsController)
);

export const agentToolsRouter = router;
