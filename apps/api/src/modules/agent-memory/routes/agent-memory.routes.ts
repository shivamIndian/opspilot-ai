import { Router } from 'express';
import { agentMemoryController } from '../controllers/agent-memory.controller.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';
import { requireOrganizationContext } from '../../organizations/middleware/organization-context.middleware.js';

export const agentMemoryRouter = Router({ mergeParams: true });

// Require authentication and active organization membership
agentMemoryRouter.use(requireAuthentication);
agentMemoryRouter.use(requireOrganizationContext);

// Memory Collection & Utility Routes
agentMemoryRouter.get('/', (req, res, next) => agentMemoryController.listMemories(req, res, next));
agentMemoryRouter.post('/', (req, res, next) => agentMemoryController.createMemory(req, res, next));
agentMemoryRouter.delete('/', (req, res, next) => agentMemoryController.bulkPurgeMemories(req, res, next));
agentMemoryRouter.post('/search', (req, res, next) => agentMemoryController.searchMemories(req, res, next));
agentMemoryRouter.post('/suggestions', (req, res, next) => agentMemoryController.extractSuggestions(req, res, next));

// Individual Memory Resource Routes
agentMemoryRouter.get('/:memoryId', (req, res, next) => agentMemoryController.getMemory(req, res, next));
agentMemoryRouter.patch('/:memoryId', (req, res, next) => agentMemoryController.updateMemory(req, res, next));
agentMemoryRouter.delete('/:memoryId', (req, res, next) => agentMemoryController.deleteMemory(req, res, next));

// Settings Router
export const agentMemorySettingsRouter = Router({ mergeParams: true });
agentMemorySettingsRouter.use(requireAuthentication);
agentMemorySettingsRouter.use(requireOrganizationContext);

agentMemorySettingsRouter.get('/', (req, res, next) => agentMemoryController.getSettings(req, res, next));
agentMemorySettingsRouter.patch('/', (req, res, next) => agentMemoryController.updateSettings(req, res, next));
