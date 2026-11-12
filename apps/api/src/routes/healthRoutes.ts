import { Router } from 'express';
import { getHealth, getReadiness } from '../controllers/healthController.js';

export const healthRouter = Router();

// Liveness probe
healthRouter.get('/health', getHealth);

// Readiness probe
healthRouter.get('/health/ready', getReadiness);
