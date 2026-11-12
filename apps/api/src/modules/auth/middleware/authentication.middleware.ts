import type { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/token.service.js';
import type { PlatformRole } from '../types/auth.types.js';

export const requireAuthentication = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token required',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = tokenService.verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
    };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: (error as Error).message || 'Invalid or expired access token',
      },
    });
  }
};

export const requirePlatformRole = (...allowedRoles: PlatformRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: insufficient platform privileges',
        },
      });
      return;
    }

    next();
  };
};
