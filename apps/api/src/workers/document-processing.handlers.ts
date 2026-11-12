import { UnrecoverableError, type Job } from 'bullmq';
import { logger } from '../utils/logger.js';
import { documentRepository } from '../modules/documents/repositories/document.repository.js';
import { documentProcessingRepository } from '../modules/documents/processing/document-processing.repository.js';
import {
  documentProcessingClient,
  AiProcessingClientError,
} from '../modules/documents/processing/document-processing.client.js';
import { StorageFactory } from '../modules/documents/storage/storage.factory.js';
import { documentAuditService } from '../modules/documents/services/document-audit.service.js';
import { documentEmbeddingRepository } from '../modules/documents/embeddings/embedding.repository.js';
import { scheduleDocumentEmbedding } from '../queues/document-embedding.queue.js';
import {
  DEFAULT_EMBEDDING_PROVIDER,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_DIMENSIONS,
} from '../modules/documents/embeddings/embedding.constants.js';
import { config } from '../config/env.js';
import type {
  DocumentProcessingJobData,
  DocumentProcessingJobResult,
} from '../modules/documents/processing/document-processing.types.js';

export const handleDocumentProcessingJob = async (
  job: Job<DocumentProcessingJobData>
): Promise<DocumentProcessingJobResult> => {
  const { organizationId, documentId, processingGeneration, pipelineVersion } = job.data;
  const attempt = job.attemptsMade + 1;
  const startTime = Date.now();

  logger.info(
    `[Worker] Processing job=${job.id} for doc=${documentId}, org=${organizationId}, ` +
      `gen=${processingGeneration}, attempt=${attempt}`
  );

  // 1. Authoritative verification of document existence and organization ownership
  const document = await documentRepository.findById(organizationId, documentId);
  if (!document) {
    logger.warn(`[Worker] Document ${documentId} not found in org ${organizationId}. Aborting.`);
    throw new UnrecoverableError('DOCUMENT_NOT_FOUND');
  }

  // 2. Reject archived documents from automated or scheduled processing
  if (document.status === 'archived' || document.archived_at !== null) {
    logger.warn(`[Worker] Document ${documentId} is archived. Aborting processing.`);
    await documentProcessingRepository.updateStatus(
      organizationId,
      documentId,
      processingGeneration,
      {
        status: 'failed',
        errorCode: 'DOCUMENT_ARCHIVED',
      }
    );
    throw new UnrecoverableError('DOCUMENT_ARCHIVED');
  }

  // 3. Stale generation check
  const currentStatus = await documentProcessingRepository.getStatus(organizationId, documentId);
  if (currentStatus && currentStatus.generation > processingGeneration) {
    logger.info(
      `[Worker] Job generation ${processingGeneration} is superseded by gen ${currentStatus.generation}. Skipping.`
    );
    return {
      success: false,
      errorCode: 'SUPERSEDED_GENERATION',
    };
  }

  // 4. Update status in app.documents to 'processing'
  await documentProcessingRepository.updateStatus(
    organizationId,
    documentId,
    processingGeneration,
    {
      status: 'processing',
      attempts: attempt,
      startedAt: new Date(),
      pipelineVersion,
      errorCode: null,
    }
  );

  try {
    // 5. Obtain authorized binary read stream from private storage provider
    const storageProvider = StorageFactory.getProvider();
    const fileStream = await storageProvider.readStream(organizationId, document.storage_key);

    // 6. Transmit to Python AI processing service via authenticated internal API
    const aiResult = await documentProcessingClient.sendToAiService({
      organizationId,
      documentId,
      processingGeneration,
      pipelineVersion,
      sourceChecksum: document.sha256_checksum,
      fileExtension: document.file_extension,
      mimeType: document.mime_type,
      filename: document.original_filename,
      fileStream,
    });

    const durationMs = Date.now() - startTime;

    // 7. Update status to 'completed' with metrics
    await documentProcessingRepository.updateStatus(
      organizationId,
      documentId,
      processingGeneration,
      {
        status: 'completed',
        pageCount: aiResult.pageCount,
        extractedCharCount: aiResult.extractedCharCount,
        chunkCount: aiResult.chunkCount,
        completedAt: new Date(),
        errorCode: null,
        pipelineVersion,
      }
    );

    // 8. Record audit log
    await documentAuditService
      .logDocumentAction({
        organizationId,
        actorUserId: document.uploaded_by_user_id,
        documentId,
        action: 'document.uploaded', // Or pipeline audit action
        metadata: {
          processingGeneration,
          pipelineVersion,
          pageCount: aiResult.pageCount,
          chunkCount: aiResult.chunkCount,
          durationMs,
        },
      })
      .catch(err => {
        logger.warn('Failed to log processing audit log:', err.message);
      });

    // 9. Automatically trigger asynchronous embedding generation pipeline
    try {
      const provider = config.EMBEDDING_PROVIDER || DEFAULT_EMBEDDING_PROVIDER;
      const model = config.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
      const dimensions = config.EMBEDDING_DIMENSIONS || DEFAULT_EMBEDDING_DIMENSIONS;

      const incremented = await documentEmbeddingRepository.incrementGenerationAndSetQueued(
        organizationId,
        documentId,
        provider,
        model,
        dimensions
      );

      if (incremented) {
        await scheduleDocumentEmbedding({
          organizationId,
          documentId,
          processingGeneration,
          embeddingGeneration: incremented.generation,
          provider,
          model,
          dimensions,
        });
        logger.info(
          `[Worker] Automatically triggered embedding job for doc=${documentId}, emb_gen=${incremented.generation}`
        );
      }
    } catch (embScheduleErr) {
      logger.warn(
        `Failed to schedule embedding job after extraction for doc=${documentId}: ${(embScheduleErr as Error).message}`
      );
    }

    logger.info(
      `[Worker] Job ${job.id} completed successfully in ${durationMs}ms: ` +
        `pages=${aiResult.pageCount}, chunks=${aiResult.chunkCount}`
    );

    return aiResult;
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const isClientError = err instanceof AiProcessingClientError;
    const errorCode = isClientError ? err.errorCode : 'INTERNAL_PROCESSING_ERROR';
    const isRetryable = isClientError ? err.isRetryable : true;
    const maxAttempts = job.opts.attempts || 3;
    const isFinalAttempt = attempt >= maxAttempts;

    logger.error(
      `[Worker] Job ${job.id} failed after ${durationMs}ms: ` +
        `code=${errorCode}, retryable=${isRetryable}, final=${isFinalAttempt}, ` +
        `msg=${(err as Error).message}`
    );

    if (!isRetryable || isFinalAttempt) {
      // Mark failed in database
      await documentProcessingRepository.updateStatus(
        organizationId,
        documentId,
        processingGeneration,
        {
          status: 'failed',
          errorCode,
          completedAt: new Date(),
        }
      );

      // Stop BullMQ from retrying non-retryable failures
      throw new UnrecoverableError((err as Error).message);
    }

    // Set status to queued for retry backoff
    await documentProcessingRepository.updateStatus(
      organizationId,
      documentId,
      processingGeneration,
      {
        status: 'queued',
        errorCode,
      }
    );

    // Re-throw so BullMQ schedules exponential retry
    throw err;
  }
};
