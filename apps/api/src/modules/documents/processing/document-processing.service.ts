import { documentRepository } from '../repositories/document.repository.js';
import {
  documentProcessingRepository,
  DocumentProcessingRepository,
} from './document-processing.repository.js';
import { scheduleDocumentProcessing } from '../../../queues/document-processing.queue.js';
import { isOrgAdminOrOwner, canViewDocument } from '../permissions/document-permissions.js';
import { DEFAULT_PIPELINE_VERSION } from './document-processing.constants.js';
import { logger } from '../../../utils/logger.js';
import type { OrganizationRole } from '../../organizations/types/organization.types.js';
import type { DocumentProcessingStatusResponse } from './document-processing.types.js';

export class DocumentProcessingService {
  constructor(private procRepo: DocumentProcessingRepository = documentProcessingRepository) {}

  /**
   * Retrieves processing status for a document if caller has permission.
   */
  async getProcessingStatus(
    organizationId: string,
    actorUserId: string,
    role: OrganizationRole,
    documentId: string
  ): Promise<DocumentProcessingStatusResponse> {
    const document = await documentRepository.findById(organizationId, documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (!canViewDocument(role, actorUserId, document)) {
      throw new Error('FORBIDDEN');
    }

    const status = await this.procRepo.getStatus(organizationId, documentId);
    if (!status) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    return status;
  }

  /**
   * Manually requests document reprocessing with a new processing generation.
   * Permitted for: Organization Owners and Admins only.
   */
  async requestReprocessing(
    organizationId: string,
    _actorUserId: string,
    role: OrganizationRole,
    documentId: string
  ): Promise<DocumentProcessingStatusResponse> {
    if (!isOrgAdminOrOwner(role)) {
      throw new Error('FORBIDDEN');
    }

    const document = await documentRepository.findById(organizationId, documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (document.status === 'archived' || document.archived_at !== null) {
      throw new Error('DOCUMENT_ARCHIVED');
    }

    // Atomically increment generation and set queued
    const incremented = await this.procRepo.incrementGenerationAndSetQueued(
      organizationId,
      documentId,
      DEFAULT_PIPELINE_VERSION
    );

    if (!incremented) {
      // Document is currently in-progress or locked
      throw new Error('DOCUMENT_PROCESSING_IN_PROGRESS');
    }

    try {
      // Schedule BullMQ job with deterministic generation-based job ID
      await scheduleDocumentProcessing({
        organizationId,
        documentId,
        processingGeneration: incremented.generation,
        pipelineVersion: DEFAULT_PIPELINE_VERSION,
      });
    } catch (err: unknown) {
      logger.error(
        `Failed to schedule processing queue job for doc=${documentId}: ${(err as Error).message}`
      );
      await this.procRepo.updateStatus(organizationId, documentId, incremented.generation, {
        status: 'failed',
        errorCode: 'QUEUE_SCHEDULING_FAILED',
      });
      throw new Error('QUEUE_SCHEDULING_FAILED');
    }

    const status = await this.procRepo.getStatus(organizationId, documentId);
    return status!;
  }
}

export const documentProcessingService = new DocumentProcessingService();
