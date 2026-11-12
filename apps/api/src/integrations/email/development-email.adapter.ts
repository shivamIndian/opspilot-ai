import type { EmailMessage, IEmailAdapter } from './email.interface.js';
import { logger } from '../../utils/logger.js';

export class DevelopmentEmailAdapter implements IEmailAdapter {
  async sendEmail(message: EmailMessage): Promise<void> {
    logger.info('======================================================================');
    logger.info(`[DEV EMAIL ADAPTER] To: ${message.to}`);
    logger.info(`[DEV EMAIL ADAPTER] Subject: ${message.subject}`);
    logger.info('----------------------------------------------------------------------');
    logger.info(message.text);
    logger.info('======================================================================');
  }
}
