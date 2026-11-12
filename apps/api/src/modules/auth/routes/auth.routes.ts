import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import {
  requireAuthentication,
  requirePlatformRole,
} from '../middleware/authentication.middleware.js';
import { requireCsrfProtection } from '../middleware/csrf.middleware.js';
import { authRateLimiter, refreshRateLimiter } from '../middleware/rate-limit.middleware.js';

export const authRouter = Router();

// Public Authentication Endpoints
authRouter.post('/register', authRateLimiter, (req, res, next) =>
  authController.register(req, res, next)
);

authRouter.post('/login', authRateLimiter, (req, res, next) =>
  authController.login(req, res, next)
);

authRouter.post('/refresh', refreshRateLimiter, requireCsrfProtection, (req, res, next) =>
  authController.refresh(req, res, next)
);

authRouter.post('/logout', requireCsrfProtection, (req, res, next) =>
  authController.logout(req, res, next)
);

authRouter.post('/logout-all', requireAuthentication, requireCsrfProtection, (req, res, next) =>
  authController.logoutAll(req, res, next)
);

authRouter.get('/me', requireAuthentication, (req, res, next) =>
  authController.getCurrentUser(req, res, next)
);

// Platform Admin restricted endpoint for role verification
authRouter.get(
  '/admin/verify',
  requireAuthentication,
  requirePlatformRole('platform_admin'),
  (_req, res) => {
    res.status(200).json({ success: true, message: 'Platform admin access verified' });
  }
);

authRouter.post('/forgot-password', authRateLimiter, (req, res, next) =>
  authController.forgotPassword(req, res, next)
);

authRouter.post('/reset-password', authRateLimiter, (req, res, next) =>
  authController.resetPassword(req, res, next)
);

authRouter.post('/verify-email', authRateLimiter, (req, res, next) =>
  authController.verifyEmail(req, res, next)
);

authRouter.post('/resend-verification', authRateLimiter, (req, res, next) =>
  authController.resendVerification(req, res, next)
);
