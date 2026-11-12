import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import type { ApiErrorResponse } from '../types/index.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response<ApiErrorResponse>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors[0]?.message || 'Request validation failed',
        details: err.format(),
      },
    });
    return;
  }

  const statusCode = (err as any).statusCode || (err as any).status;
  const errorCode = (err as any).code;
  if (statusCode && typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600) {
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 409 ? 'INVALID_STATE' : 'APPLICATION_ERROR'),
        message: err.message,
      },
    });
    return;
  }

  logger.error('Unhandled application exception:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal error occurred',
    },
  });
};
