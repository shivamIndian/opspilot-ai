import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../../../config/env.js';

const tempUploadDir = path.resolve(os.tmpdir(), 'opspilot-temp-uploads');

// Ensure temporary upload directory exists
try {
  fs.mkdirSync(tempUploadDir, { recursive: true, mode: 0o700 });
} catch {
  // Directory creation may already have occurred
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate unpredictable temp filename
    const unique = `${crypto.randomUUID()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const maxSizeBytes = (env.MAX_DOCUMENT_SIZE_MB || 25) * 1024 * 1024;

const uploader = multer({
  storage,
  limits: {
    fileSize: maxSizeBytes,
    files: 1,
  },
}).single('file');

/**
 * Express middleware that wraps Multer upload to format errors gracefully.
 */
export const handleDocumentUpload = (req: Request, res: Response, next: NextFunction): void => {
  uploader(req, res, err => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File exceeds maximum allowed size of ${env.MAX_DOCUMENT_SIZE_MB}MB`,
            },
          });
          return;
        }
        res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message,
          },
        });
        return;
      }
      next(err);
      return;
    }
    next();
  });
};

/**
 * Safely removes a temporary file from disk.
 */
export const cleanupTempFile = async (filePath?: string): Promise<void> => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Ignore error if file is already unlinked or missing
  }
};
