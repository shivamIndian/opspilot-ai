import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  documentUploadService,
  DocumentUploadService,
} from '../services/document-upload.service.js';
import {
  documentDownloadService,
  DocumentDownloadService,
} from '../services/document-download.service.js';
import { documentService, DocumentService } from '../services/document.service.js';
import {
  documentProcessingService,
  DocumentProcessingService,
} from '../processing/document-processing.service.js';
import {
  documentEmbeddingOrchestrationService,
  DocumentEmbeddingOrchestrationService,
} from '../embeddings/embedding-orchestration.service.js';
import {
  updateDocumentSchema,
  uploadMetadataSchema,
  documentQuerySchema,
} from '../validators/document.schema.js';
import { cleanupTempFile } from '../middleware/document-upload.middleware.js';

export class DocumentController {
  constructor(
    private uploadService: DocumentUploadService = documentUploadService,
    private downloadService: DocumentDownloadService = documentDownloadService,
    private docService: DocumentService = documentService,
    private procService: DocumentProcessingService = documentProcessingService,
    private embService: DocumentEmbeddingOrchestrationService = documentEmbeddingOrchestrationService
  ) {}

  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'A document file is required under the "file" form field',
        },
      });
      return;
    }

    try {
      const metadata = uploadMetadataSchema.parse(req.body);

      const document = await this.uploadService.uploadDocument({
        organizationId: req.organization!.id,
        actorUserId: req.user!.id,
        originalFilename: file.originalname,
        declaredMimeType: file.mimetype,
        tempFilePath: file.path,
        displayName: metadata.displayName,
        description: metadata.description,
      });

      res.status(201).json({
        success: true,
        data: { document },
      });
    } catch (error) {
      // Ensure temp file is cleaned up if upload failed
      await cleanupTempFile(file.path);

      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid upload parameters',
            details: error.errors,
          },
        });
        return;
      }

      if (error instanceof Error) {
        if (
          error.message.startsWith('INVALID_') ||
          error.message.startsWith('UNSUPPORTED_') ||
          error.message.startsWith('FILE_TOO_LARGE')
        ) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DOCUMENT_FILE',
              message: error.message,
            },
          });
          return;
        }
      }

      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = documentQuerySchema.parse(req.query);
      const result = await this.docService.listDocuments(req.organization!.id, query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid query parameters',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  }

  async getDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId;
      const document = await this.docService.getDocumentDetails(req.organization!.id, documentId);

      res.status(200).json({
        success: true,
        data: { document },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'DOCUMENT_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found or inaccessible in this organization',
          },
        });
        return;
      }
      next(error);
    }
  }

  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId;
      const { stream, document } = await this.downloadService.prepareDownload(
        req.organization!.id,
        req.user!.id,
        req.organization!.role,
        documentId
      );

      // Sanitize filename for Content-Disposition header
      const safeAsciiFilename = document.original_filename
        .replace(/["\r\n\\]/g, '_')
        .replace(/[^\x20-\x7E]/g, '_');
      const encodedFilename = encodeURIComponent(document.original_filename);

      res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
      res.setHeader('Content-Length', document.size_bytes.toString());
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');

      stream.on('error', err => {
        next(err);
      });

      stream.pipe(res);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'DOCUMENT_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found or inaccessible',
            },
          });
          return;
        }

        if (error.message === 'DOCUMENT_ARCHIVED') {
          res.status(400).json({
            success: false,
            error: {
              code: 'DOCUMENT_ARCHIVED',
              message: 'Archived documents cannot be downloaded',
            },
          });
          return;
        }

        if (error.message === 'FORBIDDEN') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to download this document',
            },
          });
          return;
        }
      }
      next(error);
    }
  }

  async updateMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId;
      const parsed = updateDocumentSchema.parse(req.body);

      const document = await this.docService.updateDocumentMetadata(
        req.organization!.id,
        req.user!.id,
        req.organization!.role,
        documentId,
        parsed
      );

      res.status(200).json({
        success: true,
        data: { document },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid input data',
            details: error.errors,
          },
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message === 'DOCUMENT_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found',
            },
          });
          return;
        }

        if (error.message === 'DOCUMENT_ARCHIVED') {
          res.status(400).json({
            success: false,
            error: {
              code: 'DOCUMENT_ARCHIVED',
              message: 'Archived documents cannot be modified',
            },
          });
          return;
        }

        if (error.message === 'FORBIDDEN') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Only document uploader or organization admins can update metadata',
            },
          });
          return;
        }
      }

      next(error);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId;
      const document = await this.docService.archiveDocument(
        req.organization!.id,
        req.user!.id,
        req.organization!.role,
        documentId
      );

      res.status(200).json({
        success: true,
        data: { document },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'DOCUMENT_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found',
            },
          });
          return;
        }

        if (error.message === 'FORBIDDEN') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Only organization admins and owners can archive documents',
            },
          });
          return;
        }
      }

      next(error);
    }
  }

  async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId;
      const document = await this.docService.restoreDocument(
        req.organization!.id,
        req.user!.id,
        req.organization!.role,
        documentId
      );

      res.status(200).json({
        success: true,
        data: { document },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'DOCUMENT_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found',
            },
          });
          return;
        }

        if (error.message === 'FORBIDDEN') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Only organization admins and owners can restore documents',
            },
          });
          return;
        }
      }

      next(error);
    }
  }

  async getProcessingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId;
      const processing = await this.procService.getProcessingStatus(
        req.organization!.id,
        req.user!.id,
        req.organization!.role,
        documentId
      );

      res.status(200).json({
        success: true,
        data: { processing },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'DOCUMENT_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found or inaccessible',
            },
          });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view processing status for this document',
            },
          });
          return;
        }
      }
      next(error);
    }
  }

  async reprocess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId;
      const processing = await this.procService.requestReprocessing(
        req.organization!.id,
        req.user!.id,
        req.organization!.role,
        documentId
      );

      res.status(202).json({
        success: true,
        data: { processing },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'DOCUMENT_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found or inaccessible',
            },
          });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message:
                'Only organization administrators and owners can trigger document reprocessing',
            },
          });
          return;
        }
        if (error.message === 'DOCUMENT_ARCHIVED') {
          res.status(400).json({
            success: false,
            error: {
              code: 'DOCUMENT_ARCHIVED',
              message: 'Archived documents cannot be reprocessed',
            },
          });
          return;
        }
        if (error.message === 'DOCUMENT_PROCESSING_IN_PROGRESS') {
          res.status(409).json({
            success: false,
            error: {
              code: 'DOCUMENT_PROCESSING_IN_PROGRESS',
              message: 'Document is already being processed or currently locked',
            },
          });
          return;
        }
        if (error.message === 'QUEUE_SCHEDULING_FAILED') {
          res.status(503).json({
            success: false,
            error: {
              code: 'QUEUE_SCHEDULING_FAILED',
              message: 'Unable to schedule processing job. Please try again later.',
            },
          });
          return;
        }
      }
      next(error);
    }
  }

  async getEmbeddingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId;
      const embedding = await this.embService.getEmbeddingStatus(
        req.organization!.id,
        req.user!.id,
        req.organization!.role,
        documentId
      );

      res.status(200).json({
        success: true,
        data: { embedding },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'DOCUMENT_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found or inaccessible',
            },
          });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to view embedding status for this document',
            },
          });
          return;
        }
      }
      next(error);
    }
  }

  async reprocessEmbeddings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId;
      const embedding = await this.embService.requestReprocessing(
        req.organization!.id,
        req.user!.id,
        req.organization!.role,
        documentId
      );

      res.status(202).json({
        success: true,
        data: { embedding },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'DOCUMENT_NOT_FOUND') {
          res.status(404).json({
            success: false,
            error: {
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Document not found or inaccessible',
            },
          });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message:
                'Only organization administrators and owners can trigger embedding generation',
            },
          });
          return;
        }
        if (error.message === 'DOCUMENT_ARCHIVED') {
          res.status(400).json({
            success: false,
            error: {
              code: 'DOCUMENT_ARCHIVED',
              message: 'Archived documents cannot generate embeddings',
            },
          });
          return;
        }
        if (error.message === 'DOCUMENT_NOT_EXTRACTED') {
          res.status(400).json({
            success: false,
            error: {
              code: 'DOCUMENT_NOT_EXTRACTED',
              message: 'Document text extraction must complete before embeddings can be generated',
            },
          });
          return;
        }
        if (error.message === 'EMBEDDING_PROCESSING_IN_PROGRESS') {
          res.status(409).json({
            success: false,
            error: {
              code: 'EMBEDDING_PROCESSING_IN_PROGRESS',
              message: 'Document embeddings are already being processed or currently locked',
            },
          });
          return;
        }
        if (error.message === 'QUEUE_SCHEDULING_FAILED') {
          res.status(503).json({
            success: false,
            error: {
              code: 'QUEUE_SCHEDULING_FAILED',
              message: 'Unable to schedule embedding job. Please try again later.',
            },
          });
          return;
        }
      }
      next(error);
    }
  }
}

export const documentController = new DocumentController();
