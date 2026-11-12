import type { Request, Response, NextFunction } from 'express';
import { organizationRepository } from '../repositories/organization.repository.js';
import { memberRepository } from '../repositories/member.repository.js';
import { ROLE_PERMISSIONS } from '../permissions/organization-permissions.js';
import type { OrganizationPermission, OrganizationRole } from '../types/organization.types.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that the authenticated user has an active membership in the requested organization.
 * Resolves the user's role and permissions from authoritative database state and attaches
 * req.organization context.
 */
export const requireOrganizationContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required before accessing organization resources',
        },
      });
      return;
    }

    const organizationId = req.params.organizationId;

    if (!organizationId || !UUID_REGEX.test(organizationId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORGANIZATION_ID',
          message: 'A valid organization UUID must be provided in route parameters',
        },
      });
      return;
    }

    // 1. Fetch organization
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      // Intentionally return 404 to avoid leaking existence of organizations to non-members
      res.status(404).json({
        success: false,
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        },
      });
      return;
    }

    if (org.status === 'archived') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ORGANIZATION_ARCHIVED',
          message: 'This organization has been archived and is inaccessible',
        },
      });
      return;
    }

    if (org.status === 'suspended') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ORGANIZATION_SUSPENDED',
          message: 'This organization has been suspended. Please contact administrator support.',
        },
      });
      return;
    }

    // 2. Resolve active membership directly from database
    const membership = await memberRepository.findByOrgAndUser(organizationId, req.user.id);

    if (!membership || membership.status !== 'active') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_NOT_ORGANIZATION_MEMBER',
          message: 'You are not an active member of this organization',
        },
      });
      return;
    }

    // 3. Resolve permissions and attach organization context
    req.organization = {
      id: org.id,
      role: membership.role,
      membershipId: membership.id,
      permissions: ROLE_PERMISSIONS[membership.role] || [],
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Ensures the member holds a specific organization permission.
 */
export const requireOrgPermission = (permission: OrganizationPermission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.organization) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ORGANIZATION_CONTEXT_MISSING',
          message: 'Organization context must be verified before checking permissions',
        },
      });
      return;
    }

    if (!req.organization.permissions.includes(permission)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ORGANIZATION_PERMISSIONS',
          message: `Your organization role (${req.organization.role}) does not have '${permission}' permission`,
        },
      });
      return;
    }

    next();
  };
};

/**
 * Ensures the member holds one of the allowed organization roles.
 */
export const requireOrgRole = (...allowedRoles: OrganizationRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.organization) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ORGANIZATION_CONTEXT_MISSING',
          message: 'Organization context must be verified before checking roles',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.organization.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ORGANIZATION_ROLE',
          message: `This action requires one of the following organization roles: ${allowedRoles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
};
