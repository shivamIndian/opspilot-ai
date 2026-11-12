import { Router } from 'express';
import { invitationController } from '../controllers/invitation.controller.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';

export const invitationRouter = Router();

// Accept organization invitation (authenticated user with verified email)
invitationRouter.post('/accept', requireAuthentication, (req, res, next) =>
  invitationController.accept(req, res, next)
);
