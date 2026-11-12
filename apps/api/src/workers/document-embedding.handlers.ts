import { UnrecoverableError, type Job } from 'bullmq';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';
import { documentRepository } from '../modules/documents/repositories/document.repository.js';
import { documentEmbeddingRepository } from '../modules/documents/embeddings/embedding.repository.js';
import {
  documentEmbeddingClient,
  AiEmbeddingClientError,
} from '../modules/documents/embeddings/embedding.client.js';
import { documentAuditService } from '../modules/documents/services/document-audit.service.js';
import {
  DEFAULT_EMBEDDING_PROVIDER,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_DIMENSIONS,
} from '../modules/documents/embeddings/embedding.constants.js';
import type {
  DocumentEmbeddingJobData,
  DocumentEmbeddingJobResult,
} from '../modules/documents/embeddings/embedding.types.js';

export const handleDocumentEmbeddingJob = async (
  job: Job<DocumentEmbeddingJobData>
): Promise<DocumentEmbeddingJobResult> => {
  const {
    organizationId,
    documentId,
    processingGeneration,
    embeddingGeneration,
    provider = config.EMBEDDING_PROVIDER || DEFAULT_EMBEDDING_PROVIDER,
    model = config.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
    dimensions = config.EMBEDDING_DIMENSIONS || DEFAULT_EMBEDDING_DIMENSIONS,
  } = job.data;

  const attempt = job.attemptsMade + 1;
  const startTime = Date.now();

  logger.info(
    `[EmbeddingWorker] Processing job=${job.id} for doc=${documentId}, org=${organizationId}, ` +
      `emb_gen=${embeddingGeneration}, proc_gen=${processingGeneration}, attempt=${attempt}`
  );

  // 1. Authoritative verification of document existence and organization ownership
  const document = await documentRepository.findById(organizationId, documentId);
  if (!document) {
    logger.warn(
      `[EmbeddingWorker] Document ${documentId} not found in org ${organizationId}. Aborting.`
    );
    throw new UnrecoverableError('DOCUMENT_NOT_FOUND');
  }

  // 2. Reject archived documents from automated or scheduled processing
  if (document.status === 'archived' || document.archived_at !== null) {
    logger.warn(`[EmbeddingWorker] Document ${documentId} is archived. Aborting embedding.`);
    await documentEmbeddingRepository.updateStatus(
      organizationId,
      documentId,
      embeddingGeneration,
      {
        status: 'failed',
        errorCode: 'DOCUMENT_ARCHIVED',
      }
    );
    throw new UnrecoverableError('DOCUMENT_ARCHIVED');
  }

  // 3. Verify chunk extraction is completed
  if (document.processing_status !== 'completed') {
    logger.warn(
      `[EmbeddingWorker] Document ${documentId} processing status is '${document.processing_status}', not 'completed'.`
    );
    await documentEmbeddingRepository.updateStatus(
      organizationId,
      documentId,
      embeddingGeneration,
      {
        status: 'failed',
        errorCode: 'DOCUMENT_NOT_EXTRACTED',
      }
    );
    throw new UnrecoverableError('DOCUMENT_NOT_EXTRACTED');
  }

  // 4. Stale generation check
  const currentStatus = await documentEmbeddingRepository.getStatus(organizationId, documentId);
  if (currentStatus && currentStatus.generation > embeddingGeneration) {
    logger.info(
      `[EmbeddingWorker] Job generation ${embeddingGeneration} is superseded by gen ${currentStatus.generation}. Skipping.`
    );
    return {
      success: false,
      organizationId,
      documentId,
      embeddingGeneration,
      provider,
      model,
      dimensions,
      embeddingSpace: '',
      totalChunks: 0,
      embeddedChunks: 0,
      failedChunks: 0,
      status: 'skipped',
      durationMs: 0,
      errorCode: 'SUPERSEDED_GENERATION',
    };
  }

  // 5. Update status in app.documents to 'processing'
  await documentEmbeddingRepository.updateStatus(organizationId, documentId, embeddingGeneration, {
    status: 'processing',
    startedAt: new Date(),
    provider,
    model,
    dimensions,
    errorCode: null,
  });

  try {
    // 6. Forward embedding generation to Python AI service via internal API
    const aiResult = await documentEmbeddingClient.generateEmbeddings({
      organizationId,
      documentId,
      processingGeneration,
      embeddingGeneration,
      provider,
      model,
      dimensions,
    });

    const durationMs = Date.now() - startTime;

    // 7. Update status to 'completed' with embedded chunk count
    await documentEmbeddingRepository.updateStatus(
      organizationId,
      documentId,
      embeddingGeneration,
      {
        status: 'completed',
        embeddedChunkCount: aiResult.embeddedChunks,
        embeddedAt: new Date(),
        errorCode: null,
        provider,
        model,
        dimensions,
      }
    );

    // 8. Record audit log
    await documentAuditService
      .logDocumentAction({
        organizationId,
        actorUserId: document.uploaded_by_user_id,
        documentId,
        action: 'document.metadata_updated',
        metadata: {
          embeddingGeneration,
          provider,
          model,
          dimensions,
          totalChunks: aiResult.totalChunks,
          embeddedChunks: aiResult.embeddedChunks,
          durationMs,
        },
      })
      .catch(err => {
        logger.warn('Failed to log embedding audit log:', err.message);
      });

    logger.info(
      `[EmbeddingWorker] Job ${job.id} completed successfully in ${durationMs}ms: ` +
        `embeddedChunks=${aiResult.embeddedChunks}/${aiResult.totalChunks}`
    );

    return aiResult;
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const isClientError = err instanceof AiEmbeddingClientError;
    const errorCode = isClientError ? err.errorCode : 'INTERNAL_PROCESSING_ERROR';
    const isRetryable = isClientError ? err.isRetryable : true;
    const maxAttempts = job.opts.attempts || 3;
    const isFinalAttempt = attempt >= maxAttempts;

    logger.error(
      `[EmbeddingWorker] Job ${job.id} failed after ${durationMs}ms: ` +
        `code=${errorCode}, retryable=${isRetryable}, final=${isFinalAttempt}, ` +
        `msg=${(err as Error).message}`
    );

    if (!isRetryable || isFinalAttempt) {
      // Mark failed in database
      await documentEmbeddingRepository.updateStatus(
        organizationId,
        documentId,
        embeddingGeneration,
        {
          status: 'failed',
          errorCode,
        }
      );

      // Stop BullMQ from retrying non-retryable failures
      throw new UnrecoverableError((err as Error).message);
    }

    // Set status to queued for retry backoff
    await documentEmbeddingRepository.updateStatus(
      organizationId,
      documentId,
      embeddingGeneration,
      {
        status: 'queued',
        errorCode,
      }
    );

    // Re-throw so BullMQ schedules exponential retry
    throw err;
  }
};
