import type { Request, Response } from 'express';
import type { RootResponse } from '../types/index.js';

export const getRoot = (_req: Request, res: Response<RootResponse>): void => {
  res.status(200).json({
    success: true,
    service: 'OpsPilot API',
    message: 'API is running',
  });
};
