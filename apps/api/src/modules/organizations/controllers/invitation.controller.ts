import type { Request, Response, NextFunction } from 'express';
import { invitationService } from '../services/invitation.service.js';
import { inviteMemberSchema, acceptInvitationSchema } from '../validators/organization.schema.js';
import type { InvitationStatus } from '../types/organization.types.js';

export class InvitationController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const input = inviteMemberSchema.parse(req.body);
      const invitation = await invitationService.createInvitation(
        req.organization.id,
        req.user.id,
        req.organization.role,
        input
      );

      res.status(201).json({
        success: true,
        message: `Invitation successfully sent to ${invitation.email}`,
        data: { invitation },
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'ADMIN_CANNOT_INVITE_ADMIN') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_CANNOT_INVITE_ADMIN',
            message: 'Organization admins can only invite normal members, not fellow admins',
          },
        });
        return;
      }
      if (msg === 'USER_ALREADY_MEMBER') {
        res.status(409).json({
          success: false,
          error: {
            code: 'USER_ALREADY_MEMBER',
            message:
              'A user with this email address is already an active member of this organization',
          },
        });
        return;
      }
      if (msg === 'PENDING_INVITATION_EXISTS') {
        res.status(409).json({
          success: false,
          error: {
            code: 'PENDING_INVITATION_EXISTS',
            message: 'A pending invitation already exists for this email address',
          },
        });
        return;
      }
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const status =
        typeof req.query.status === 'string' &&
        ['pending', 'accepted', 'expired', 'revoked'].includes(req.query.status)
          ? (req.query.status as InvitationStatus)
          : undefined;
      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;

      const result = await invitationService.listInvitations(req.organization.id, {
        status,
        limit,
        offset,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async resend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      await invitationService.resendInvitation(
        req.organization.id,
        req.user.id,
        req.organization.role,
        req.params.invitationId
      );

      res.status(200).json({
        success: true,
        message: 'Invitation resent successfully with a fresh token',
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'INVITATION_NOT_FOUND_OR_INACTIVE') {
        res.status(404).json({
          success: false,
          error: {
            code: 'INVITATION_NOT_FOUND',
            message: 'Pending invitation not found or is no longer active',
          },
        });
        return;
      }
      if (msg === 'ADMIN_CANNOT_MANAGE_ADMIN_INVITATIONS') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_ADMIN_HIERARCHY',
            message: 'Organization admins cannot manage admin invitations',
          },
        });
        return;
      }
      next(error);
    }
  }

  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      await invitationService.revokeInvitation(
        req.organization.id,
        req.user.id,
        req.organization.role,
        req.params.invitationId
      );

      res.status(200).json({
        success: true,
        message: 'Invitation revoked successfully',
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'INVITATION_NOT_FOUND_OR_INACTIVE') {
        res.status(404).json({
          success: false,
          error: {
            code: 'INVITATION_NOT_FOUND',
            message: 'Pending invitation not found or is no longer active',
          },
        });
        return;
      }
      if (msg === 'ADMIN_CANNOT_MANAGE_ADMIN_INVITATIONS') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_ADMIN_HIERARCHY',
            message: 'Organization admins cannot manage admin invitations',
          },
        });
        return;
      }
      next(error);
    }
  }

  async accept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required to accept invitation' },
        });
        return;
      }

      const input = acceptInvitationSchema.parse(req.body);
      const result = await invitationService.acceptInvitation(req.user.id, input.token);

      res.status(200).json({
        success: true,
        message: `Successfully joined ${result.organization.name}`,
        data: result,
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'EMAIL_NOT_VERIFIED') {
        res.status(403).json({
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message:
              'Your email address must be verified before accepting organization invitations',
          },
        });
        return;
      }
      if (msg === 'INVALID_INVITATION_TOKEN') {
        res.status(404).json({
          success: false,
          error: {
            code: 'INVALID_INVITATION_TOKEN',
            message: 'Invitation token is invalid or does not exist',
          },
        });
        return;
      }
      if (msg === 'INVITATION_ALREADY_ACCEPTED') {
        res.status(410).json({
          success: false,
          error: {
            code: 'INVITATION_ALREADY_ACCEPTED',
            message: 'This invitation has already been accepted',
          },
        });
        return;
      }
      if (msg === 'INVITATION_REVOKED') {
        res.status(410).json({
          success: false,
          error: {
            code: 'INVITATION_REVOKED',
            message: 'This invitation has been revoked by an organization administrator',
          },
        });
        return;
      }
      if (msg === 'INVITATION_EXPIRED') {
        res.status(410).json({
          success: false,
          error: {
            code: 'INVITATION_EXPIRED',
            message: 'This invitation has expired. Please ask an administrator to resend it.',
          },
        });
        return;
      }
      if (msg === 'INVITATION_EMAIL_MISMATCH') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INVITATION_EMAIL_MISMATCH',
            message: 'This invitation was addressed to a different email address',
          },
        });
        return;
      }
      if (msg === 'ALREADY_ORGANIZATION_MEMBER') {
        res.status(409).json({
          success: false,
          error: {
            code: 'ALREADY_ORGANIZATION_MEMBER',
            message: 'You are already an active member of this organization',
          },
        });
        return;
      }
      next(error);
    }
  }
}

export const invitationController = new InvitationController();
