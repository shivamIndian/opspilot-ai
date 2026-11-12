import { tokenService } from './token.service.js';
import { tokenRepository } from '../repositories/token.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { emailService } from '../../../integrations/email/email.service.js';
import { config } from '../../../config/env.js';
import type { UserEntity } from '../types/auth.types.js';

export class EmailVerificationService {
  async createAndSendVerification(user: UserEntity): Promise<void> {
    const rawToken = tokenService.generateRandomToken();
    const tokenHash = tokenService.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.EMAIL_VERIFICATION_TOKEN_TTL_HOURS);

    await tokenRepository.createEmailVerificationToken(user.id, tokenHash, expiresAt);
    await emailService.sendVerificationEmail(user.email, rawToken);

    await tokenRepository.logAuditEvent({
      userId: user.id,
      eventType: 'EMAIL_VERIFICATION_SENT',
    });
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = tokenService.hashToken(rawToken);
    const tokenRecord = await tokenRepository.findEmailVerificationToken(tokenHash);

    if (!tokenRecord) {
      throw new Error('INVALID_TOKEN');
    }

    if (tokenRecord.used_at !== null) {
      throw new Error('TOKEN_ALREADY_USED');
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
      throw new Error('TOKEN_EXPIRED');
    }

    // Mark token used and update user record
    await tokenRepository.markEmailVerificationTokenUsed(tokenRecord.id);
    await userRepository.markEmailVerified(tokenRecord.user_id);

    await tokenRepository.logAuditEvent({
      userId: tokenRecord.user_id,
      eventType: 'EMAIL_VERIFIED',
    });
  }

  async resendVerification(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);

    // If user exists and not verified yet, send fresh verification token
    if (user && !user.email_verified_at && user.status === 'active') {
      await this.createAndSendVerification(user);
    }
    // Always return silently to prevent account enumeration
  }
}

export const emailVerificationService = new EmailVerificationService();
