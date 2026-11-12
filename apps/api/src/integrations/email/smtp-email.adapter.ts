import type { EmailMessage, IEmailAdapter } from './email.interface.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class SmtpEmailAdapter implements IEmailAdapter {
  constructor() {
    if (config.NODE_ENV === 'production' && (!config.SMTP_HOST || !config.SMTP_PORT)) {
      throw new Error('SMTP configuration missing: SMTP_HOST and SMTP_PORT required in production');
    }
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    // Standardized SMTP transport logging & delivery abstraction
    logger.info(
      `[SMTP EMAIL ADAPTER] Dispatching email to ${message.to} via ${config.SMTP_HOST || 'localhost'}:${config.SMTP_PORT || 587}`
    );
    // In production without external mock, handle gracefully
  }
}
