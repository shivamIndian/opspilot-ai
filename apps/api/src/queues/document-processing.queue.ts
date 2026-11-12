import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
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
      connectTimeout: config.REDIS_CONNECT_TIMEOUT_MS,
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
  const queue = getDocumentProcessingQueue();
  const jobId = `document-${data.documentId}-generation-${data.processingGeneration}`;

  const job = await queue.add('process-document', data, {
    jobId,
    pipelineVersion: data.pipelineVersion || DEFAULT_PIPELINE_VERSION,
  } as any);

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
