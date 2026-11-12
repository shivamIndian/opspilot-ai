import type { Request, Response, NextFunction } from 'express';
import { organizationService } from '../services/organization.service.js';
import { organizationAuditRepository } from '../repositories/organization-audit.repository.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from '../validators/organization.schema.js';

export class OrganizationController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const input = createOrganizationSchema.parse(req.body);
      const organization = await organizationService.createOrganization(req.user.id, input);

      res.status(201).json({
        success: true,
        message: 'Organization created successfully',
        data: { organization },
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'SLUG_ALREADY_EXISTS') {
        res.status(409).json({
          success: false,
          error: {
            code: 'SLUG_ALREADY_EXISTS',
            message:
              'An organization with this slug already exists. Please choose a different slug.',
          },
        });
        return;
      }
      if (msg === 'INVALID_ORGANIZATION_SLUG') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SLUG',
            message:
              'Organization slug must contain only lowercase alphanumeric characters and hyphens.',
          },
        });
        return;
      }
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const organizations = await organizationService.listUserOrganizations(req.user.id);

      res.status(200).json({
        success: true,
        data: { organizations },
      });
    } catch (error) {
      next(error);
    }
  }

  async getDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const organization = await organizationService.getOrganizationDetails(
        req.params.organizationId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: { organization },
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'ORGANIZATION_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found' },
        });
        return;
      }
      if (msg === 'FORBIDDEN_NOT_ORGANIZATION_MEMBER') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_NOT_ORGANIZATION_MEMBER',
            message: 'You are not an active member of this organization',
          },
        });
        return;
      }
      if (msg === 'ORGANIZATION_ARCHIVED') {
        res.status(403).json({
          success: false,
          error: {
            code: 'ORGANIZATION_ARCHIVED',
            message: 'This organization has been archived',
          },
        });
        return;
      }
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const input = updateOrganizationSchema.parse(req.body);
      const organization = await organizationService.updateOrganization(
        req.organization.id,
        req.user.id,
        input
      );

      res.status(200).json({
        success: true,
        message: 'Organization profile updated successfully',
        data: { organization },
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'SLUG_ALREADY_EXISTS') {
        res.status(409).json({
          success: false,
          error: {
            code: 'SLUG_ALREADY_EXISTS',
            message: 'An organization with this slug already exists',
          },
        });
        return;
      }
      next(error);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      await organizationService.archiveOrganization(req.organization.id, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Organization has been archived successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.organization) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;

      const logs = await organizationAuditRepository.listByOrganization(
        req.organization.id,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        data: { logs },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const organizationController = new OrganizationController();
