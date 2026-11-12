import type { Response, NextFunction } from 'express';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import { memberRepository } from '../../organizations/repositories/member.repository.js';
import { delegationTokenService } from '../services/delegation-token.service.js';
import type { AuthenticatedToolRequest } from '../types/agent-tools.types.js';

export async function delegatedToolAuthMiddleware(
  req: AuthenticatedToolRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // 1. Service-to-service internal token check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_SERVICE',
        message: 'Missing or malformed internal service Authorization header',
      },
    });
    return;
  }

  const serviceToken = authHeader.split(' ')[1];
  if (serviceToken !== config.AI_SERVICE_INTERNAL_TOKEN) {
    logger.warn('[AgentTools] Internal service token mismatch on tool gateway invocation');
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_SERVICE_TOKEN',
        message: 'Invalid internal service authentication credentials',
      },
    });
    return;
  }

  // 2. Delegated authorization token verification
  const rawDelegationToken = req.headers['x-delegation-token'];
  if (!rawDelegationToken || typeof rawDelegationToken !== 'string') {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_DELEGATION_TOKEN',
        message: 'Missing required x-delegation-token assertion header',
      },
    });
    return;
  }

  let claims;
  try {
    claims = delegationTokenService.verifyDelegationToken(rawDelegationToken);
  } catch (error) {
    const errMessage = (error as Error).message;
    const isExpired = errMessage.toLowerCase().includes('jwt expired');
    res.status(401).json({
      success: false,
      error: {
        code: isExpired ? 'DELEGATION_EXPIRED' : 'DELEGATION_INVALID',
        message: errMessage,
      },
    });
    return;
  }

  // 3. Independent PostgreSQL tenant membership validation
  try {
    const membership = await memberRepository.findByOrgAndUser(claims.orgId, claims.sub);
    if (!membership || membership.status === 'removed' || membership.status === 'suspended') {
      logger.warn(
        `[AgentTools] Rejected tool access: user ${claims.sub} has no active membership in org ${claims.orgId}`
      );
      res.status(403).json({
        success: false,
        error: {
          code: 'ORGANIZATION_MISMATCH',
          message: 'Delegated user is not an active member of the target organization',
        },
      });
      return;
    }

    req.toolContext = {
      userId: claims.sub,
      organizationId: claims.orgId,
      membership,
      scopes: claims.scopes || [],
      requestId: claims.requestId || (req.headers['x-request-id'] as string) || claims.jti,
      correlationId: (req.headers['x-correlation-id'] as string) || undefined,
    };

    next();
  } catch (error) {
    logger.error(`[AgentTools] Database membership verification error: ${error}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'MEMBERSHIP_VERIFICATION_FAILED',
        message: 'Failed to verify organization membership',
      },
    });
  }
}

export function requireToolScope(requiredScope: string) {
  return (req: AuthenticatedToolRequest, res: Response, next: NextFunction): void => {
    if (!req.toolContext) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Tool context not established',
        },
      });
      return;
    }

    if (!req.toolContext.scopes.includes(requiredScope)) {
      logger.warn(
        `[AgentTools] User ${req.toolContext.userId} denied scope ${requiredScope} (has: ${req.toolContext.scopes.join(',')})`
      );
      res.status(403).json({
        success: false,
        error: {
          code: 'TOOL_PERMISSION_DENIED',
          message: `Insufficient permissions: missing scope '${requiredScope}'`,
          details: {
            requiredScope,
            grantedScopes: req.toolContext.scopes,
          },
        },
      });
      return;
    }

    next();
  };
}
