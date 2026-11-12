import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  DOCUMENT_PROCESSING_QUEUE_NAME,
  DOCUMENT_PROCESSING_CONCURRENCY,
} from '../modules/documents/processing/document-processing.constants.js';
import { handleDocumentProcessingJob } from './document-processing.handlers.js';
import type { DocumentProcessingJobData } from '../modules/documents/processing/document-processing.types.js';

let workerInstance: Worker<DocumentProcessingJobData> | null = null;
let workerRedisConnection: Redis | null = null;

export const getWorkerRedisConnection = (): Redis => {
  if (!workerRedisConnection) {
    workerRedisConnection = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: config.REDIS_CONNECT_TIMEOUT_MS,
    });
  }
  return workerRedisConnection;
};

export const startDocumentProcessingWorker = (): Worker<DocumentProcessingJobData> => {
  if (workerInstance) {
    return workerInstance;
  }

  logger.info(
    `[Worker] Initializing BullMQ document processing worker for queue "${DOCUMENT_PROCESSING_QUEUE_NAME}" ` +
      `with concurrency=${DOCUMENT_PROCESSING_CONCURRENCY}`
  );

  workerInstance = new Worker<DocumentProcessingJobData>(
    DOCUMENT_PROCESSING_QUEUE_NAME,
    async job => {
      return handleDocumentProcessingJob(job);
    },
    {
      connection: getWorkerRedisConnection(),
      concurrency: DOCUMENT_PROCESSING_CONCURRENCY,
    }
  );

  workerInstance.on('completed', job => {
    logger.info(`[Worker] Job ${job.id} completed successfully`);
  });

  workerInstance.on('failed', (job, err) => {
    logger.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
  });

  workerInstance.on('error', err => {
    logger.error(`[Worker] Worker error: ${err.message}`);
  });

  logger.info('[Worker] Document processing worker is actively listening for jobs.');
  return workerInstance;
};

export const closeDocumentProcessingWorker = async (): Promise<void> => {
  if (workerInstance) {
    logger.info('Closing document processing worker...');
    await workerInstance.close();
    workerInstance = null;
  }
  if (workerRedisConnection) {
    await workerRedisConnection.quit().catch(() => {});
    workerRedisConnection = null;
  }
};

// Standalone execution entrypoint
if (process.argv[1]?.includes('document-processing.worker')) {
  logger.info('Starting OpsPilot Document Processing Worker process standalone...');
  startDocumentProcessingWorker();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down worker gracefully...`);
    await closeDocumentProcessingWorker();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
