import type { IEmailAdapter } from './email.interface.js';
import { DevelopmentEmailAdapter } from './development-email.adapter.js';
import { SmtpEmailAdapter } from './smtp-email.adapter.js';
import { config } from '../../config/env.js';

export class EmailService {
  private adapter: IEmailAdapter;

  constructor(adapter?: IEmailAdapter) {
    if (adapter) {
      this.adapter = adapter;
    } else {
      this.adapter =
        config.MAIL_PROVIDER === 'smtp' ? new SmtpEmailAdapter() : new DevelopmentEmailAdapter();
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;
    await this.adapter.sendEmail({
      to: email,
      from: config.MAIL_FROM,
      subject: 'Verify your OpsPilot AI Account',
      text: `Welcome to OpsPilot AI!\n\nPlease verify your email by clicking the link below:\n${verificationUrl}\n\nThis verification link expires in ${config.EMAIL_VERIFICATION_TOKEN_TTL_HOURS} hours.\nIf you did not request this account, please ignore this email.`,
      html: `<p>Welcome to OpsPilot AI!</p><p>Please verify your email by clicking the link below:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>This link expires in ${config.EMAIL_VERIFICATION_TOKEN_TTL_HOURS} hours.</p>`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;
    await this.adapter.sendEmail({
      to: email,
      from: config.MAIL_FROM,
      subject: 'Reset your OpsPilot AI Password',
      text: `Hello,\n\nA password reset was requested for your OpsPilot AI account.\n\nPlease click the link below to set a new password:\n${resetUrl}\n\nThis link expires in ${config.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes.\nIf you did not request a password reset, your account remains secure and no action is needed.`,
      html: `<p>Hello,</p><p>A password reset was requested for your OpsPilot AI account.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in ${config.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes.</p>`,
    });
  }

  async sendOrganizationInvitation(
    email: string,
    organizationName: string,
    token: string,
    role: string,
    invitedByName?: string
  ): Promise<void> {
    const inviteUrl = `${config.FRONTEND_URL}/invitations/accept?token=${token}`;
    await this.adapter.sendEmail({
      to: email,
      from: config.MAIL_FROM,
      subject: `You've been invited to join ${organizationName} on OpsPilot AI`,
      text: `Hello,\n\n${invitedByName || 'A team member'} has invited you to join ${organizationName} as a ${role} on OpsPilot AI.\n\nPlease accept the invitation by clicking the link below:\n${inviteUrl}\n\nThis invitation link expires in 7 days.\nIf you do not have an account yet, please register with ${email} before accepting.`,
      html: `<p>Hello,</p><p><strong>${invitedByName || 'A team member'}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong> on OpsPilot AI.</p><p><a href="${inviteUrl}">Accept Organization Invitation</a></p><p>This link expires in 7 days.</p>`,
    });
  }
}

export const emailService = new EmailService();
