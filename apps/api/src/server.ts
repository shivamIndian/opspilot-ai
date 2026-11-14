import http from 'http';
import { app } from './app.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { closePool, getSanitizedDatabaseUrl, effectiveDatabaseUrl } from './database/index.js';
import { closeRedis, getSanitizedRedisUrl } from './redis/index.js';
import { closeDocumentProcessingQueue } from './queues/document-processing.queue.js';
import { closeDocumentEmbeddingQueue } from './queues/document-embedding.queue.js';

const server = http.createServer(app);

const startServer = () => {
  server.listen(config.PORT, () => {
    logger.info(`🚀 OpsPilot Core API listening on port ${config.PORT} [${config.NODE_ENV}]`);
    logger.info(`👉 Health Liveness:  http://localhost:${config.PORT}/api/v1/health`);
    logger.info(`👉 Health Readiness: http://localhost:${config.PORT}/api/v1/health/ready`);
    logger.info(`👉 Database Target:  ${getSanitizedDatabaseUrl(effectiveDatabaseUrl)}`);
    logger.info(`👉 Redis Target:     ${getSanitizedRedisUrl(config.REDIS_URL)}`);
    logger.info(`👉 Allowed CORS:     ${config.FRONTEND_URL}`);
  });
};

// Graceful shutdown management
const gracefulShutdown = (signal: string) => {
  logger.warn(
    `Received ${signal}. Starting graceful shutdown of HTTP server and infrastructure clients...`
  );
  server.close(async err => {
    if (err) {
      logger.error('Error during HTTP server shutdown:', err);
    } else {
      logger.info('HTTP server closed successfully.');
    }

    // Close downstream infrastructure connections
    await Promise.allSettled([
      closePool(),
      closeRedis(),
      closeDocumentProcessingQueue(),
      closeDocumentEmbeddingQueue(),
    ]);

    logger.info('Infrastructure connections closed. Terminating process.');
    process.exit(err ? 1 : 0);
  });

  // Force exit after 10 seconds if hanging
  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10 seconds. Forcing termination.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection detected:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception occurred:', error);
  process.exit(1);
});

startServer();
