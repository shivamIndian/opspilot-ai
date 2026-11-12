import { Router } from 'express';
import { conversationController } from '../controllers/conversation.controller.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';
import { requireOrganizationContext } from '../../organizations/middleware/organization-context.middleware.js';
import { aiOperationsLimiter } from '../../../middleware/rate-limiter.js';

export const conversationRouter = Router({ mergeParams: true });

// All conversation routes require authentication and valid active organization membership
conversationRouter.use(requireAuthentication);
conversationRouter.use(requireOrganizationContext);

// Conversation management
conversationRouter.post('/', (req, res, next) => conversationController.create(req, res, next));
conversationRouter.get('/', (req, res, next) => conversationController.list(req, res, next));
conversationRouter.get('/:conversationId', (req, res, next) => conversationController.get(req, res, next));
conversationRouter.patch('/:conversationId', (req, res, next) => conversationController.update(req, res, next));
conversationRouter.delete('/:conversationId', (req, res, next) => conversationController.archive(req, res, next));

// Messages
conversationRouter.get('/:conversationId/messages', (req, res, next) => conversationController.listMessages(req, res, next));
conversationRouter.post('/:conversationId/messages', aiOperationsLimiter, (req, res, next) => conversationController.sendMessage(req, res, next));
conversationRouter.post('/:conversationId/messages/stream', aiOperationsLimiter, (req, res, next) => conversationController.streamMessage(req, res, next));
