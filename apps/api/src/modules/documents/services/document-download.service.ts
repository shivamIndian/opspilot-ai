import type { Readable } from 'node:stream';
import { documentRepository, DocumentRepository } from '../repositories/document.repository.js';
import { documentAuditService, DocumentAuditService } from './document-audit.service.js';
import { StorageFactory } from '../storage/storage.factory.js';
import type { IStorageProvider } from '../storage/storage.interface.js';
import { canDownloadDocument } from '../permissions/document-permissions.js';
import type { OrganizationRole } from '../../organizations/types/organization.types.js';
import type { DocumentWithUploaderEntity } from '../types/document.types.js';

export interface DocumentDownloadResult {
  stream: Readable;
  document: DocumentWithUploaderEntity;
}

export class DocumentDownloadService {
  constructor(
    private docRepo: DocumentRepository = documentRepository,
    private storageProvider: IStorageProvider = StorageFactory.getProvider(),
    private auditService: DocumentAuditService = documentAuditService
  ) {}

  async prepareDownload(
    organizationId: string,
    actorUserId: string,
    role: OrganizationRole,
    documentId: string
  ): Promise<DocumentDownloadResult> {
    // 1. Fetch document metadata scoped strictly to this organization
    const document = await this.docRepo.findById(organizationId, documentId);
    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    // 2. Check download permission (e.g., archived documents cannot be downloaded)
    if (!canDownloadDocument(role, actorUserId, document)) {
      if (document.status === 'archived' || document.archived_at !== null) {
        throw new Error('DOCUMENT_ARCHIVED');
      }
      throw new Error('FORBIDDEN');
    }

    // 3. Obtain readable binary stream from the storage provider
    const stream = await this.storageProvider.readStream(organizationId, document.storage_key);

    // 4. Record document.downloaded audit event asynchronously
    this.auditService
      .logDocumentAction({
        organizationId,
        actorUserId,
        documentId: document.id,
        action: 'document.downloaded',
        metadata: {
          originalFilename: document.original_filename,
          sizeBytes: document.size_bytes,
        },
      })
      .catch(err => {
        console.error('Failed to log document download audit event:', err);
      });

    return {
      stream,
      document,
    };
  }
}

export const documentDownloadService = new DocumentDownloadService();
