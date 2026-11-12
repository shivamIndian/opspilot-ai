import { Router } from 'express';
import { aiEvaluationController } from '../controllers/ai-evaluation.controller.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';
import {
  requireOrganizationContext,
  requireOrgRole,
} from '../../organizations/middleware/organization-context.middleware.js';

export const aiEvaluationRouter = Router({ mergeParams: true });

// All AI Evaluation endpoints require active organization context and owner or admin role
aiEvaluationRouter.use(requireAuthentication);
aiEvaluationRouter.use(requireOrganizationContext);
aiEvaluationRouter.use(requireOrgRole('owner', 'admin'));

// Datasets
aiEvaluationRouter.get('/datasets', (req, res, next) =>
  aiEvaluationController.listDatasets(req, res, next)
);
aiEvaluationRouter.post('/datasets', (req, res, next) =>
  aiEvaluationController.createDataset(req, res, next)
);
aiEvaluationRouter.get('/datasets/:datasetId', (req, res, next) =>
  aiEvaluationController.getDataset(req, res, next)
);
aiEvaluationRouter.post('/datasets/:datasetId/examples', (req, res, next) =>
  aiEvaluationController.addExamples(req, res, next)
);

// Runs
aiEvaluationRouter.post('/runs', (req, res, next) =>
  aiEvaluationController.startRun(req, res, next)
);
aiEvaluationRouter.get('/runs', (req, res, next) =>
  aiEvaluationController.listRuns(req, res, next)
);
aiEvaluationRouter.get('/runs/:runId', (req, res, next) =>
  aiEvaluationController.getRun(req, res, next)
);
aiEvaluationRouter.get('/runs/:runId/results', (req, res, next) =>
  aiEvaluationController.getRunResults(req, res, next)
);

// Run Comparison
aiEvaluationRouter.get('/compare', (req, res, next) =>
  aiEvaluationController.compareRuns(req, res, next)
);
