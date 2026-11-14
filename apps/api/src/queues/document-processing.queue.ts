import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { redis } from '../redis/client.js';
import {
  DOCUMENT_PROCESSING_QUEUE_NAME,
  DOCUMENT_PROCESSING_ATTEMPTS,
  DEFAULT_PIPELINE_VERSION,
} from '../modules/documents/processing/document-processing.constants.js';
import type { DocumentProcessingJobData } from '../modules/documents/processing/document-processing.types.js';

let queueInstance: Queue<DocumentProcessingJobData> | null = null;
let queueRedisConnection: Redis | null = null;

export const getQueueRedisConnection = (): Redis => {
  if (!queueRedisConnection) {
    queueRedisConnection = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
      connectTimeout: Math.min(config.REDIS_CONNECT_TIMEOUT_MS, 2000),
    });
  }
  return queueRedisConnection;
};

export const getDocumentProcessingQueue = (): Queue<DocumentProcessingJobData> => {
  if (!queueInstance) {
    queueInstance = new Queue<DocumentProcessingJobData>(DOCUMENT_PROCESSING_QUEUE_NAME, {
      connection: getQueueRedisConnection(),
      defaultJobOptions: {
        attempts: DOCUMENT_PROCESSING_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 500, // Retain max 500 completed jobs
        },
        removeOnFail: {
          count: 1000, // Retain failed jobs for troubleshooting
        },
      },
    });

    queueInstance.on('error', err => {
      logger.error('Document processing queue error:', err.message);
    });
  }

  return queueInstance;
};

/**
 * Enqueues a document processing job with a deterministic job ID.
 */
export const scheduleDocumentProcessing = async (
  data: DocumentProcessingJobData
): Promise<string> => {
  if (redis.status !== 'ready') {
    logger.info(`[Queue] Redis status is '${redis.status}'. Skipping BullMQ queue for doc=${data.documentId}`);
    return `offline-${data.documentId}`;
  }

  const queue = getDocumentProcessingQueue();
  const jobId = `document-${data.documentId}-generation-${data.processingGeneration}`;

  const addPromise = queue.add('process-document', data, {
    jobId,
    pipelineVersion: data.pipelineVersion || DEFAULT_PIPELINE_VERSION,
  } as any);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('QUEUE_TIMEOUT')), 1500)
  );

  const job = await Promise.race([addPromise, timeoutPromise]);

  logger.info(
    `[Queue] Scheduled job ${job.id} for doc=${data.documentId}, gen=${data.processingGeneration}`
  );

  return job.id!;
};

/**
 * Gracefully closes the BullMQ queue and its underlying Redis connection.
 */
export const closeDocumentProcessingQueue = async (): Promise<void> => {
  if (queueInstance) {
    logger.info('Closing document processing queue...');
    await queueInstance.close();
    queueInstance = null;
  }
  if (queueRedisConnection) {
    await queueRedisConnection.quit().catch(() => {});
    queueRedisConnection = null;
  }
};
