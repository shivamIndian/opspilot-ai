import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { emailVerificationService } from '../services/email-verification.service.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../validators/auth.schema.js';
import { config } from '../../../config/env.js';

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.REFRESH_COOKIE_SAME_SITE,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  ...(config.REFRESH_COOKIE_DOMAIN ? { domain: config.REFRESH_COOKIE_DOMAIN } : {}),
});

const getCsrfCookieOptions = () => ({
  httpOnly: false, // Accessible to JavaScript for double-submit header injection
  secure: config.NODE_ENV === 'production',
  sameSite: config.REFRESH_COOKIE_SAME_SITE,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const user = await authService.register(input, req.ip, req.headers['user-agent']);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully. A verification email has been dispatched.',
        data: { user },
      });
    } catch (error) {
      if ((error as Error).message === 'EMAIL_ALREADY_REGISTERED') {
        res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email address already exists',
          },
        });
        return;
      }
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const { user, tokens } = await authService.login(input, req.ip, req.headers['user-agent']);

      // Set HttpOnly Refresh Cookie
      res.cookie(config.REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());

      // Set Readable CSRF Cookie
      res.cookie(config.CSRF_COOKIE_NAME, tokens.csrfToken, getCsrfCookieOptions());

      res.status(200).json({
        success: true,
        data: {
          user,
          accessToken: tokens.accessToken,
          csrfToken: tokens.csrfToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'INVALID_CREDENTIALS') {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        });
        return;
      }
      if (msg === 'ACCOUNT_SUSPENDED') {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Your account has been suspended. Please contact administrator support.',
          },
        });
        return;
      }
      next(error);
    }
  }

  async refresh(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[config.REFRESH_COOKIE_NAME];

      if (!rawRefreshToken) {
        res.status(401).json({
          success: false,
          error: {
            code: 'REFRESH_TOKEN_MISSING',
            message: 'No refresh token provided in session cookie',
          },
        });
        return;
      }

      const tokens = await authService.refresh(rawRefreshToken, req.ip, req.headers['user-agent']);

      res.cookie(config.REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());
      res.cookie(config.CSRF_COOKIE_NAME, tokens.csrfToken, getCsrfCookieOptions());

      res.status(200).json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          csrfToken: tokens.csrfToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error) {
      const msg = (error as Error).message;

      // Clear cookies on invalid/reuse/expired refresh tokens
      res.clearCookie(config.REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
      res.clearCookie(config.CSRF_COOKIE_NAME, { path: '/' });

      if (msg === 'REFRESH_TOKEN_REUSE_DETECTED') {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_REUSE_DETECTED',
            message: 'Session compromised. All sessions in this token family have been revoked.',
          },
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Refresh token expired or invalid. Please sign in again.',
        },
      });
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[config.REFRESH_COOKIE_NAME];
      if (rawRefreshToken) {
        await authService.logout(rawRefreshToken);
      }

      res.clearCookie(config.REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
      res.clearCookie(config.CSRF_COOKIE_NAME, { path: '/' });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      await authService.logoutAll(req.user.id);

      res.clearCookie(config.REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
      res.clearCookie(config.CSRF_COOKIE_NAME, { path: '/' });

      res.status(200).json({
        success: true,
        message: 'All active sessions have been revoked',
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const user = await authService.getCurrentUser(req.user.id);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = forgotPasswordSchema.parse(req.body);
      await authService.forgotPassword(input.email, req.ip, req.headers['user-agent']);

      // Generic response always
      res.status(200).json({
        success: true,
        message:
          'If an account exists with this email address, a password reset link has been dispatched.',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = resetPasswordSchema.parse(req.body);
      await authService.resetPassword(
        input.token,
        input.newPassword,
        req.ip,
        req.headers['user-agent']
      );

      res.status(200).json({
        success: true,
        message: 'Password reset successfully. You may now log in with your new password.',
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'INVALID_TOKEN' || msg === 'TOKEN_ALREADY_USED') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RESET_TOKEN',
            message: 'Password reset token is invalid or has already been used.',
          },
        });
        return;
      }
      if (msg === 'TOKEN_EXPIRED') {
        res.status(400).json({
          success: false,
          error: {
            code: 'EXPIRED_RESET_TOKEN',
            message: 'Password reset link has expired. Please request a new one.',
          },
        });
        return;
      }
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = verifyEmailSchema.parse(req.body);
      await emailVerificationService.verifyEmail(input.token);

      res.status(200).json({
        success: true,
        message: 'Email address verified successfully. Your account is fully active.',
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'INVALID_TOKEN' || msg === 'TOKEN_ALREADY_USED') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_VERIFICATION_TOKEN',
            message: 'Email verification token is invalid or has already been consumed.',
          },
        });
        return;
      }
      if (msg === 'TOKEN_EXPIRED') {
        res.status(400).json({
          success: false,
          error: {
            code: 'EXPIRED_VERIFICATION_TOKEN',
            message: 'Email verification link has expired. Please request a new one.',
          },
        });
        return;
      }
      next(error);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = resendVerificationSchema.parse(req.body);
      await emailVerificationService.resendVerification(input.email);

      res.status(200).json({
        success: true,
        message:
          'If the account exists and is unverified, a fresh verification email has been dispatched.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
