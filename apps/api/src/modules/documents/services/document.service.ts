import { documentRepository, DocumentRepository } from '../repositories/document.repository.js';
import { documentAuditService, DocumentAuditService } from './document-audit.service.js';
import {
  canUpdateDocumentMetadata,
  canArchiveDocument,
  canRestoreDocument,
} from '../permissions/document-permissions.js';
import type { OrganizationRole } from '../../organizations/types/organization.types.js';
import type { SafeDocument, DocumentFilterParams } from '../types/document.types.js';
import type { UpdateDocumentInput } from '../validators/document.schema.js';

export class DocumentService {
  constructor(
    private docRepo: DocumentRepository = documentRepository,
    private auditService: DocumentAuditService = documentAuditService
  ) {}

  /**
   * Lists documents in an organization with pagination, filtering, and sorting.
   */
  async listDocuments(
    organizationId: string,
    params: DocumentFilterParams
  ): Promise<{
    documents: SafeDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const { documents, total } = await this.docRepo.list(organizationId, params);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      documents: documents.map(doc => this.docRepo.toSafeDocument(doc)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieves single document metadata by ID within an organization.
   */
  async getDocumentDetails(organizationId: string, documentId: string): Promise<SafeDocument> {
    const document = await this.docRepo.findById(organizationId, documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    return this.docRepo.toSafeDocument(document);
  }

  /**
   * Updates document display name and/or description.
   * Permitted for: Organization Owners, Admins, or the original uploader.
   */
  async updateDocumentMetadata(
    organizationId: string,
    actorUserId: string,
    role: OrganizationRole,
    documentId: string,
    input: UpdateDocumentInput
  ): Promise<SafeDocument> {
    const document = await this.docRepo.findById(organizationId, documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (document.status === 'archived' || document.archived_at !== null) {
      throw new Error('DOCUMENT_ARCHIVED');
    }

    if (!canUpdateDocumentMetadata(role, actorUserId, document)) {
      throw new Error('FORBIDDEN');
    }

    const previousMetadata = {
      displayName: document.display_name,
      description: document.description,
    };

    const updated = await this.docRepo.updateMetadata(organizationId, documentId, {
      displayName: input.displayName,
      description: input.description,
    });

    await this.auditService.logDocumentAction({
      organizationId,
      actorUserId,
      documentId,
      action: 'document.metadata_updated',
      metadata: {
        previous: previousMetadata,
        updated: {
          displayName: updated.display_name,
          description: updated.description,
        },
      },
    });

    const refreshed = await this.docRepo.findById(organizationId, documentId);
    return this.docRepo.toSafeDocument(refreshed || { ...document, ...updated });
  }

  /**
   * Soft-archives a document.
   * Permitted for: Organization Owners and Admins only.
   */
  async archiveDocument(
    organizationId: string,
    actorUserId: string,
    role: OrganizationRole,
    documentId: string
  ): Promise<SafeDocument> {
    if (!canArchiveDocument(role)) {
      throw new Error('FORBIDDEN');
    }

    const document = await this.docRepo.findById(organizationId, documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (document.status === 'archived') {
      return this.docRepo.toSafeDocument(document);
    }

    const archived = await this.docRepo.archive(organizationId, documentId);

    await this.auditService.logDocumentAction({
      organizationId,
      actorUserId,
      documentId,
      action: 'document.archived',
      metadata: {
        originalFilename: document.original_filename,
        displayName: document.display_name,
      },
    });

    const refreshed = await this.docRepo.findById(organizationId, documentId);
    return this.docRepo.toSafeDocument(refreshed || { ...document, ...archived });
  }

  /**
   * Restores a soft-archived document.
   * Permitted for: Organization Owners and Admins only.
   */
  async restoreDocument(
    organizationId: string,
    actorUserId: string,
    role: OrganizationRole,
    documentId: string
  ): Promise<SafeDocument> {
    if (!canRestoreDocument(role)) {
      throw new Error('FORBIDDEN');
    }

    const document = await this.docRepo.findById(organizationId, documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    if (document.status === 'active') {
      return this.docRepo.toSafeDocument(document);
    }

    const restored = await this.docRepo.restore(organizationId, documentId);

    await this.auditService.logDocumentAction({
      organizationId,
      actorUserId,
      documentId,
      action: 'document.restored',
      metadata: {
        originalFilename: document.original_filename,
        displayName: document.display_name,
      },
    });

    const refreshed = await this.docRepo.findById(organizationId, documentId);
    return this.docRepo.toSafeDocument(refreshed || { ...document, ...restored });
  }
}

export const documentService = new DocumentService();
