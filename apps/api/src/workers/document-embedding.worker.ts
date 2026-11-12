import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  DOCUMENT_EMBEDDING_QUEUE_NAME,
  DOCUMENT_EMBEDDING_CONCURRENCY,
} from '../modules/documents/embeddings/embedding.constants.js';
import { handleDocumentEmbeddingJob } from './document-embedding.handlers.js';
import type { DocumentEmbeddingJobData } from '../modules/documents/embeddings/embedding.types.js';

let workerInstance: Worker<DocumentEmbeddingJobData> | null = null;
let workerRedisConnection: Redis | null = null;

export const getEmbeddingWorkerRedisConnection = (): Redis => {
  if (!workerRedisConnection) {
    workerRedisConnection = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: config.REDIS_CONNECT_TIMEOUT_MS,
    });
  }
  return workerRedisConnection;
};

export const startDocumentEmbeddingWorker = (): Worker<DocumentEmbeddingJobData> => {
  if (workerInstance) {
    return workerInstance;
  }

  const concurrency = config.DOCUMENT_EMBEDDING_CONCURRENCY || DOCUMENT_EMBEDDING_CONCURRENCY;

  logger.info(
    `[EmbeddingWorker] Initializing BullMQ document embedding worker for queue "${DOCUMENT_EMBEDDING_QUEUE_NAME}" ` +
      `with concurrency=${concurrency}`
  );

  workerInstance = new Worker<DocumentEmbeddingJobData>(
    DOCUMENT_EMBEDDING_QUEUE_NAME,
    async job => {
      return handleDocumentEmbeddingJob(job);
    },
    {
      connection: getEmbeddingWorkerRedisConnection(),
      concurrency,
    }
  );

  workerInstance.on('completed', job => {
    logger.info(`[EmbeddingWorker] Job ${job.id} completed successfully`);
  });

  workerInstance.on('failed', (job, err) => {
    logger.error(`[EmbeddingWorker] Job ${job?.id} failed: ${err.message}`);
  });

  workerInstance.on('error', err => {
    logger.error(`[EmbeddingWorker] Worker error: ${err.message}`);
  });

  logger.info('[EmbeddingWorker] Document embedding worker is actively listening for jobs.');
  return workerInstance;
};

export const stopDocumentEmbeddingWorker = async (): Promise<void> => {
  if (workerInstance) {
    logger.info('[EmbeddingWorker] Stopping document embedding worker...');
    await workerInstance.close();
    workerInstance = null;
  }
  if (workerRedisConnection) {
    await workerRedisConnection.quit().catch(() => {});
    workerRedisConnection = null;
  }
  logger.info('[EmbeddingWorker] Worker stopped cleanly.');
};

// Auto-run if executed as a standalone entrypoint process
if (process.argv[1] && process.argv[1].includes('document-embedding.worker')) {
  startDocumentEmbeddingWorker();

  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down embedding worker gracefully...`);
    await stopDocumentEmbeddingWorker();
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}
