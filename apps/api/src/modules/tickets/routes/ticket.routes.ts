import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller.js';
import { ticketCommentController } from '../controllers/ticket-comment.controller.js';
import { ticketActivityController } from '../controllers/ticket-activity.controller.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';
import { requireOrganizationContext } from '../../organizations/middleware/organization-context.middleware.js';

export const ticketRouter = Router({ mergeParams: true });

// All ticket endpoints require authentication and active organization membership
ticketRouter.use(requireAuthentication);
ticketRouter.use(requireOrganizationContext);

// 1. Dashboard summary metrics (placed before /:ticketId to prevent route conflict)
ticketRouter.get('/summary', (req, res, next) => ticketController.getSummary(req, res, next));

// 2. Ticket collection routes
ticketRouter.post('/', (req, res, next) => ticketController.create(req, res, next));

ticketRouter.get('/', (req, res, next) => ticketController.list(req, res, next));

// 3. Single ticket routes
ticketRouter.get('/:ticketId', (req, res, next) => ticketController.getDetails(req, res, next));

ticketRouter.patch('/:ticketId', (req, res, next) => ticketController.update(req, res, next));

ticketRouter.post('/:ticketId/assign', (req, res, next) => ticketController.assign(req, res, next));

ticketRouter.patch('/:ticketId/priority', (req, res, next) =>
  ticketController.updatePriority(req, res, next)
);

ticketRouter.patch('/:ticketId/status', (req, res, next) =>
  ticketController.updateStatus(req, res, next)
);

ticketRouter.post('/:ticketId/archive', (req, res, next) =>
  ticketController.archive(req, res, next)
);

// 4. Ticket comments and internal notes
ticketRouter.post('/:ticketId/comments', (req, res, next) =>
  ticketCommentController.addComment(req, res, next)
);

ticketRouter.get('/:ticketId/comments', (req, res, next) =>
  ticketCommentController.listComments(req, res, next)
);

// 5. Ticket activity history
ticketRouter.get('/:ticketId/activity', (req, res, next) =>
  ticketActivityController.listActivity(req, res, next)
);
