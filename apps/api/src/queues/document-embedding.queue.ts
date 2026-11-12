import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  DOCUMENT_EMBEDDING_QUEUE_NAME,
  DOCUMENT_EMBEDDING_ATTEMPTS,
} from '../modules/documents/embeddings/embedding.constants.js';
import type { DocumentEmbeddingJobData } from '../modules/documents/embeddings/embedding.types.js';

let queueInstance: Queue<DocumentEmbeddingJobData> | null = null;
let queueRedisConnection: Redis | null = null;

export const getEmbeddingQueueRedisConnection = (): Redis => {
  if (!queueRedisConnection) {
    queueRedisConnection = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: config.REDIS_CONNECT_TIMEOUT_MS,
    });
  }
  return queueRedisConnection;
};

export const getDocumentEmbeddingQueue = (): Queue<DocumentEmbeddingJobData> => {
  if (!queueInstance) {
    queueInstance = new Queue<DocumentEmbeddingJobData>(DOCUMENT_EMBEDDING_QUEUE_NAME, {
      connection: getEmbeddingQueueRedisConnection(),
      defaultJobOptions: {
        attempts: DOCUMENT_EMBEDDING_ATTEMPTS,
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
      logger.error('Document embedding queue error:', err.message);
    });
  }

  return queueInstance;
};

/**
 * Enqueues a document embedding job with a deterministic job ID.
 */
export const scheduleDocumentEmbedding = async (
  data: DocumentEmbeddingJobData
): Promise<string> => {
  const queue = getDocumentEmbeddingQueue();
  const jobId = `document-${data.documentId}-emb-gen-${data.embeddingGeneration}`;

  const job = await queue.add('generate-embeddings', data, {
    jobId,
  });

  logger.info(
    `[Queue] Scheduled embedding job ${job.id} for doc=${data.documentId}, emb_gen=${data.embeddingGeneration}`
  );

  return job.id!;
};

/**
 * Gracefully closes the BullMQ embedding queue and its underlying Redis connection.
 */
export const closeDocumentEmbeddingQueue = async (): Promise<void> => {
  if (queueInstance) {
    logger.info('Closing document embedding queue...');
    await queueInstance.close();
    queueInstance = null;
  }
  if (queueRedisConnection) {
    await queueRedisConnection.quit().catch(() => {});
    queueRedisConnection = null;
  }
};
