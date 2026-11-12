import { documentRepository } from '../repositories/document.repository.js';
import {
  documentEmbeddingRepository,
  DocumentEmbeddingRepository,
} from './embedding.repository.js';
import { scheduleDocumentEmbedding } from '../../../queues/document-embedding.queue.js';
import { isOrgAdminOrOwner, canViewDocument } from '../permissions/document-permissions.js';
import {
  DEFAULT_EMBEDDING_PROVIDER,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_DIMENSIONS,
} from './embedding.constants.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import type { OrganizationRole } from '../../organizations/types/organization.types.js';
import type { DocumentEmbeddingStatusResponse } from './embedding.types.js';

export class DocumentEmbeddingOrchestrationService {
  constructor(private embRepo: DocumentEmbeddingRepository = documentEmbeddingRepository) {}

  /**
   * Retrieves embedding status for a document if caller has view permissions.
   */
  async getEmbeddingStatus(
    organizationId: string,
    actorUserId: string,
    role: OrganizationRole,
    documentId: string
  ): Promise<DocumentEmbeddingStatusResponse> {
    const document = await documentRepository.findById(organizationId, documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (!canViewDocument(role, actorUserId, document)) {
      throw new Error('FORBIDDEN');
    }

    const status = await this.embRepo.getStatus(organizationId, documentId);
    if (!status) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    return status;
  }

  /**
   * Manually requests document embedding generation or regeneration.
   * Permitted for: Organization Owners and Admins only.
   */
  async requestReprocessing(
    organizationId: string,
    _actorUserId: string,
    role: OrganizationRole,
    documentId: string
  ): Promise<DocumentEmbeddingStatusResponse> {
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

    if (document.processing_status !== 'completed') {
      throw new Error('DOCUMENT_NOT_EXTRACTED');
    }

    const provider = config.EMBEDDING_PROVIDER || DEFAULT_EMBEDDING_PROVIDER;
    const model = config.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
    const dimensions = config.EMBEDDING_DIMENSIONS || DEFAULT_EMBEDDING_DIMENSIONS;

    // Atomically increment generation and set status = 'queued'
    const incremented = await this.embRepo.incrementGenerationAndSetQueued(
      organizationId,
      documentId,
      provider,
      model,
      dimensions
    );

    if (!incremented) {
      throw new Error('EMBEDDING_PROCESSING_IN_PROGRESS');
    }

    try {
      // Schedule BullMQ job with deterministic generation-based job ID
      await scheduleDocumentEmbedding({
        organizationId,
        documentId,
        processingGeneration: document.processing_generation || 1,
        embeddingGeneration: incremented.generation,
        provider,
        model,
        dimensions,
      });
    } catch (err: unknown) {
      logger.error(
        `Failed to schedule embedding queue job for doc=${documentId}: ${(err as Error).message}`
      );
      await this.embRepo.updateStatus(organizationId, documentId, incremented.generation, {
        status: 'failed',
        errorCode: 'QUEUE_SCHEDULING_FAILED',
      });
      throw new Error('QUEUE_SCHEDULING_FAILED');
    }

    const status = await this.embRepo.getStatus(organizationId, documentId);
    return status!;
  }
}

export const documentEmbeddingOrchestrationService = new DocumentEmbeddingOrchestrationService();
