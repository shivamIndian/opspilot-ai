import { Router } from 'express';
import { invitationController } from '../controllers/invitation.controller.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';

export const invitationRouter = Router();

// List pending invitations for the authenticated user
invitationRouter.get('/my-pending', requireAuthentication, (req, res, next) =>
  invitationController.listMyPending(req, res, next)
);

// Direct 1-click acceptance of pending invitation for authenticated user
invitationRouter.post('/:invitationId/accept-direct', requireAuthentication, (req, res, next) =>
  invitationController.acceptDirect(req, res, next)
);

// Accept organization invitation (authenticated user with verified email)
invitationRouter.post('/accept', requireAuthentication, (req, res, next) =>
  invitationController.accept(req, res, next)
);
