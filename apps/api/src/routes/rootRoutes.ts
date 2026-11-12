import { Router } from 'express';
import { getRoot } from '../controllers/rootController.js';

export const rootRouter = Router();

rootRouter.get('/', getRoot);
