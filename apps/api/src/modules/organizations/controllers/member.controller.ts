import type { Request, Response, NextFunction } from 'express';
import { memberService } from '../services/member.service.js';
import {
  updateMemberRoleSchema,
  transferOwnershipSchema,
} from '../validators/organization.schema.js';
import type { OrganizationRole, MembershipStatus } from '../types/organization.types.js';

export class MemberController {
  async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const role =
        typeof req.query.role === 'string' && ['owner', 'admin', 'member'].includes(req.query.role)
          ? (req.query.role as OrganizationRole)
          : undefined;
      const status =
        typeof req.query.status === 'string' &&
        ['active', 'suspended', 'removed'].includes(req.query.status)
          ? (req.query.status as MembershipStatus)
          : undefined;
      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;

      const result = await memberService.listMembers(req.organization.id, {
        search,
        role,
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

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const input = updateMemberRoleSchema.parse(req.body);
      const member = await memberService.updateMemberRole(
        req.organization.id,
        req.user.id,
        req.organization.role,
        req.params.memberId,
        input.role
      );

      res.status(200).json({
        success: true,
        message: 'Member role updated successfully',
        data: { member },
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'MEMBER_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found in this organization' },
        });
        return;
      }
      if (msg === 'CANNOT_SET_OWNER_ROLE_VIA_UPDATE') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE_UPDATE',
            message:
              'Organization ownership must be transferred using the ownership transfer endpoint',
          },
        });
        return;
      }
      if (msg === 'CANNOT_DEMOTE_OR_MODIFY_OWNER_ROLE') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_CANNOT_MODIFY_OWNER',
            message: 'Organization owner role cannot be demoted or modified directly',
          },
        });
        return;
      }
      if (msg === 'ADMIN_CANNOT_MANAGE_ADMINS') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_ADMIN_HIERARCHY',
            message:
              'Organization admins can only manage normal members and cannot promote to or manage admins',
          },
        });
        return;
      }
      next(error);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      await memberService.removeMember(
        req.organization.id,
        req.user.id,
        req.organization.role,
        req.params.memberId
      );

      res.status(200).json({
        success: true,
        message: 'Member removed from organization successfully',
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'MEMBER_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found in this organization' },
        });
        return;
      }
      if (msg === 'CANNOT_REMOVE_ORGANIZATION_OWNER') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_CANNOT_REMOVE_OWNER',
            message: 'The organization owner cannot be removed. Transfer ownership first.',
          },
        });
        return;
      }
      if (msg === 'ADMIN_CANNOT_REMOVE_ADMINS') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_ADMIN_HIERARCHY',
            message: 'Organization admins cannot remove other admins or the organization owner',
          },
        });
        return;
      }
      next(error);
    }
  }

  async leave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      await memberService.leaveOrganization(req.organization.id, req.user.id);

      res.status(200).json({
        success: true,
        message: 'You have left the organization successfully',
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'OWNER_CANNOT_LEAVE_WITHOUT_TRANSFER') {
        res.status(400).json({
          success: false,
          error: {
            code: 'OWNER_CANNOT_LEAVE',
            message:
              'Organization owners cannot leave without transferring ownership to another member first',
          },
        });
        return;
      }
      next(error);
    }
  }

  async transferOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      if (req.organization.role !== 'owner') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_NOT_OWNER',
            message: 'Only the current active owner can transfer organization ownership',
          },
        });
        return;
      }

      const input = transferOwnershipSchema.parse(req.body);
      const result = await memberService.transferOwnership(
        req.organization.id,
        req.user.id,
        input.newOwnerUserId
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'TARGET_USER_NOT_ORGANIZATION_MEMBER') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSFER_TARGET',
            message: 'Target user is not an active member of this organization',
          },
        });
        return;
      }
      if (msg === 'CANNOT_TRANSFER_TO_SELF') {
        res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_TRANSFER_TO_SELF',
            message: 'You are already the active owner of this organization',
          },
        });
        return;
      }
      next(error);
    }
  }
}

export const memberController = new MemberController();
