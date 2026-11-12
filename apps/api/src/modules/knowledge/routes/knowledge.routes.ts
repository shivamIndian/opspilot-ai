import { Router } from 'express';
import { knowledgeController } from '../controllers/knowledge.controller.js';
import { requireOrganizationContext } from '../../organizations/middleware/organization-context.middleware.js';
import { knowledgeAnswerRateLimiter } from '../middleware/knowledge-rate-limit.middleware.js';

export const knowledgeRouter = Router({ mergeParams: true });

// Require caller to be an active member of :organizationId
knowledgeRouter.use(requireOrganizationContext);

// POST /api/v1/organizations/:organizationId/knowledge/search
knowledgeRouter.post('/search', (req, res, next) => knowledgeController.search(req, res, next));

// POST /api/v1/organizations/:organizationId/knowledge/answer (Module 10)
knowledgeRouter.post('/answer', knowledgeAnswerRateLimiter, (req, res, next) =>
  knowledgeController.generateAnswer(req, res, next)
);
