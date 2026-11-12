import crypto from 'node:crypto';
import type { Pool } from 'pg';
import { pool } from '../../../database/index.js';
import { documentRepository, DocumentRepository } from '../repositories/document.repository.js';
import {
  documentValidationService,
  DocumentValidationService,
} from './document-validation.service.js';
import { documentAuditService, DocumentAuditService } from './document-audit.service.js';
import {
  documentProcessingRepository,
  DocumentProcessingRepository,
} from '../processing/document-processing.repository.js';
import { scheduleDocumentProcessing } from '../../../queues/document-processing.queue.js';
import { DEFAULT_PIPELINE_VERSION } from '../processing/document-processing.constants.js';
import { logger } from '../../../utils/logger.js';
import { StorageFactory } from '../storage/storage.factory.js';
import type { IStorageProvider } from '../storage/storage.interface.js';
import { cleanupTempFile } from '../middleware/document-upload.middleware.js';
import type { SafeDocument } from '../types/document.types.js';

export interface UploadDocumentParams {
  organizationId: string;
  actorUserId: string;
  originalFilename: string;
  declaredMimeType: string;
  tempFilePath: string;
  displayName?: string;
  description?: string;
}

export class DocumentUploadService {
  constructor(
    private db: Pool = pool,
    private docRepo: DocumentRepository = documentRepository,
    private validator: DocumentValidationService = documentValidationService,
    private auditService: DocumentAuditService = documentAuditService,
    private storageProvider: IStorageProvider = StorageFactory.getProvider(),
    private procRepo: DocumentProcessingRepository = documentProcessingRepository
  ) {}

  async uploadDocument(params: UploadDocumentParams): Promise<SafeDocument> {
    let savedStorageKey: string | null = null;

    try {
      // 1. Validate file format, size, declared MIME, and deep magic bytes signature
      const validation = await this.validator.validateFile(
        params.originalFilename,
        params.declaredMimeType,
        params.tempFilePath
      );

      if (!validation.isValid) {
        throw new Error(validation.error || 'INVALID_FILE: Validation failed');
      }

      // 2. Generate an unpredictable, random storage key
      const storageKey = `${crypto.randomUUID()}.${validation.fileExtension}`;

      // 3. Save file into private storage provider
      await this.storageProvider.save({
        organizationId: params.organizationId,
        storageKey,
        sourcePath: params.tempFilePath,
        mimeType: validation.normalizedMimeType,
      });

      savedStorageKey = storageKey;

      // 4. Save metadata in PostgreSQL within a transaction
      const client = await this.db.connect();

      let createdDoc;
      try {
        await client.query('BEGIN');

        createdDoc = await this.docRepo.create(
          {
            organizationId: params.organizationId,
            uploadedByUserId: params.actorUserId,
            originalFilename: params.originalFilename,
            displayName: params.displayName?.trim() || params.originalFilename,
            description: params.description?.trim() || null,
            fileExtension: validation.fileExtension,
            mimeType: validation.normalizedMimeType,
            sizeBytes: validation.sizeBytes,
            sha256Checksum: validation.sha256Checksum,
            storageProvider: 'local',
            storageKey,
            metadata: {
              validationVersion: '1.0',
            },
          },
          client
        );

        // 5. Record document.uploaded audit event
        await this.auditService.logDocumentAction(
          {
            organizationId: params.organizationId,
            actorUserId: params.actorUserId,
            documentId: createdDoc.id,
            action: 'document.uploaded',
            metadata: {
              originalFilename: params.originalFilename,
              fileExtension: validation.fileExtension,
              sizeBytes: validation.sizeBytes,
              sha256Checksum: validation.sha256Checksum,
            },
          },
          client
        );

        await client.query('COMMIT');
      } catch (dbError) {
        await client.query('ROLLBACK');

        // Safe compensation: delete stored physical file if database transaction failed
        if (savedStorageKey) {
          try {
            await this.storageProvider.delete(params.organizationId, savedStorageKey);
          } catch {
            // Ignore compensation cleanup error
          }
        }
        throw dbError;
      } finally {
        client.release();
      }

      // 6. Schedule BullMQ document processing job asynchronously
      try {
        await scheduleDocumentProcessing({
          organizationId: params.organizationId,
          documentId: createdDoc.id,
          processingGeneration: 1,
          pipelineVersion: DEFAULT_PIPELINE_VERSION,
        });

        await this.procRepo.updateStatus(params.organizationId, createdDoc.id, 1, {
          status: 'queued',
          pipelineVersion: DEFAULT_PIPELINE_VERSION,
        });
      } catch (queueErr) {
        logger.warn(
          `Failed to schedule BullMQ queue job after upload for doc=${createdDoc.id}: ${(queueErr as Error).message}`
        );
        // Do not rollback document upload if queue scheduling fails. Record sanitized error and allow retry.
        await this.procRepo.updateStatus(params.organizationId, createdDoc.id, 1, {
          status: 'failed',
          errorCode: 'QUEUE_SCHEDULING_FAILED',
        });
      }

      // Fetch with joined uploader details
      const docWithUser = await this.docRepo.findById(params.organizationId, createdDoc.id);

      return this.docRepo.toSafeDocument(
        docWithUser || {
          ...createdDoc,
          uploader_name: 'You',
          uploader_email: '',
        }
      );
    } finally {
      // 6. Always clean up temporary upload file
      await cleanupTempFile(params.tempFilePath);
    }
  }
}

export const documentUploadService = new DocumentUploadService();
