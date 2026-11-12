import type { PoolClient } from 'pg';
import {
  organizationAuditRepository,
  OrganizationAuditRepository,
} from '../../organizations/repositories/organization-audit.repository.js';
import type { DocumentAction } from '../types/document.types.js';

export class DocumentAuditService {
  constructor(private auditRepo: OrganizationAuditRepository = organizationAuditRepository) {}

  async logDocumentAction(
    params: {
      organizationId: string;
      actorUserId: string | null;
      documentId: string;
      action: DocumentAction;
      metadata?: Record<string, unknown>;
    },
    client?: PoolClient
  ) {
    return this.auditRepo.logEvent(
      {
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: params.action,
        targetType: 'document',
        targetId: params.documentId,
        metadata: params.metadata || {},
      },
      client
    );
  }
}

export const documentAuditService = new DocumentAuditService();
