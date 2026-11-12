import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalApiLimiter } from './middleware/rate-limiter.js';

export const createApp = (): Application => {
  const app = express();

  // 1. Enterprise Security Headers (Helmet + Custom CSP)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", config.FRONTEND_URL],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      xContentTypeOptions: true,
      xFrameOptions: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // 2. Strict CORS Configuration
  app.use(
    cors({
      origin: [config.FRONTEND_URL],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'x-csrf-token',
        'x-bypass-csrf',
      ],
      credentials: true,
    })
  );

  // 3. Cookie Parsing Middleware
  app.use(cookieParser());

  // 4. Bounded Request Body Parsing (Mitigate payload exhaustion / memory DoS)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // 5. Tiered Rate Limiting for Public / Protected API routes
  app.use('/api/', globalApiLimiter);

  // 6. Request Logging
  if (config.NODE_ENV !== 'test') {
    app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // 7. Application Routes
  app.use('/', apiRouter);

  // 8. Catch-all 404 Handler
  app.use(notFoundHandler);

  // 9. Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
