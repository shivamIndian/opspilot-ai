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

  // Trust first proxy hop (Render / Cloudflare / Vercel edge reverse proxy)
  app.set('trust proxy', 1);

  // Extract clean origin from config.FRONTEND_URL
  const getFrontendOrigin = () => {
    try {
      return new URL(config.FRONTEND_URL).origin;
    } catch {
      return config.FRONTEND_URL;
    }
  };
  const configuredOrigin = getFrontendOrigin();

  // 1. Enterprise Security Headers (Helmet + Custom CSP)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", configuredOrigin, config.FRONTEND_URL, 'https://*.vercel.app'],
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

  // 2. Strict CORS Configuration with Dynamic Vercel and Localhost Support
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or vercel rewrite proxy)
        if (!origin) return callback(null, true);

        const normalized = origin.trim();
        if (
          normalized === configuredOrigin ||
          normalized === config.FRONTEND_URL ||
          normalized.endsWith('.vercel.app') ||
          normalized.includes('localhost') ||
          normalized.includes('127.0.0.1')
        ) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
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
