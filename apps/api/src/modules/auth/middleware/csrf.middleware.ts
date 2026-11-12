import type { Request, Response, NextFunction } from 'express';
import { config } from '../../../config/env.js';

/**
 * Double-submit cookie CSRF verification middleware.
 * Enforces that the client sends a matching CSRF token in header vs readable cookie.
 */
export const requireCsrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // In test environment, allow bypassing if explicitly flagged
  if (config.NODE_ENV === 'test' && req.headers['x-bypass-csrf'] === 'true') {
    return next();
  }

  const cookieToken = req.cookies?.[config.CSRF_COOKIE_NAME];
  const headerToken = req.headers[config.CSRF_HEADER_NAME.toLowerCase()] as string | undefined;

  if (!cookieToken || !headerToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF verification failed: missing CSRF token in cookie or request header',
      },
    });
    return;
  }

  // Constant-time-like string equality
  if (cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISMATCH',
        message: 'CSRF verification failed: token mismatch',
      },
    });
    return;
  }

  next();
};
