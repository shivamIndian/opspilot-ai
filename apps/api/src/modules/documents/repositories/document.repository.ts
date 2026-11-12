import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../database/index.js';
import type {
  DocumentEntity,
  DocumentWithUploaderEntity,
  SafeDocument,
  DocumentExtension,
  DocumentStorageProvider,
  DocumentFilterParams,
} from '../types/document.types.js';

export interface CreateDocumentParams {
  organizationId: string;
  uploadedByUserId: string;
  originalFilename: string;
  displayName: string;
  description?: string | null;
  fileExtension: DocumentExtension;
  mimeType: string;
  sizeBytes: number;
  sha256Checksum: string;
  storageProvider: DocumentStorageProvider;
  storageKey: string;
  metadata?: Record<string, unknown>;
}

export class DocumentRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async create(params: CreateDocumentParams, client?: PoolClient): Promise<DocumentEntity> {
    const executor = client || this.db;
    const query = `
      INSERT INTO app.documents (
        organization_id,
        uploaded_by_user_id,
        original_filename,
        display_name,
        description,
        file_extension,
        mime_type,
        size_bytes,
        sha256_checksum,
        storage_provider,
        storage_key,
        status,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12)
      RETURNING *;
    `;

    const result = await executor.query(query, [
      params.organizationId,
      params.uploadedByUserId,
      params.originalFilename,
      params.displayName,
      params.description || null,
      params.fileExtension,
      params.mimeType,
      params.sizeBytes,
      params.sha256Checksum,
      params.storageProvider,
      params.storageKey,
      JSON.stringify(params.metadata || {}),
    ]);

    return result.rows[0];
  }

  async findById(
    organizationId: string,
    documentId: string,
    client?: PoolClient
  ): Promise<DocumentWithUploaderEntity | null> {
    const executor = client || this.db;
    const query = `
      SELECT 
        d.*,
        u.name AS uploader_name,
        u.email AS uploader_email
      FROM app.documents d
      JOIN app.users u ON d.uploaded_by_user_id = u.id
      WHERE d.organization_id = $1 AND d.id = $2;
    `;

    const result = await executor.query(query, [organizationId, documentId]);
    return result.rows[0] || null;
  }

  async findByIdForUpdate(
    organizationId: string,
    documentId: string,
    client: PoolClient
  ): Promise<DocumentEntity | null> {
    const query = `
      SELECT * FROM app.documents
      WHERE organization_id = $1 AND id = $2
      FOR UPDATE;
    `;

    const result = await client.query(query, [organizationId, documentId]);
    return result.rows[0] || null;
  }

  async updateMetadata(
    organizationId: string,
    documentId: string,
    fields: { displayName?: string; description?: string | null },
    client?: PoolClient
  ): Promise<DocumentEntity> {
    const executor = client || this.db;
    const updates: string[] = [];
    const values: unknown[] = [organizationId, documentId];
    let idx = 3;

    if (fields.displayName !== undefined) {
      updates.push(`display_name = $${idx++}`);
      values.push(fields.displayName);
    }
    if (fields.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(fields.description);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE app.documents
      SET ${updates.join(', ')}
      WHERE organization_id = $1 AND id = $2
      RETURNING *;
    `;

    const result = await executor.query(query, values);
    return result.rows[0];
  }

  async archive(
    organizationId: string,
    documentId: string,
    client?: PoolClient
  ): Promise<DocumentEntity> {
    const executor = client || this.db;
    const query = `
      UPDATE app.documents
      SET status = 'archived', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 AND id = $2
      RETURNING *;
    `;

    const result = await executor.query(query, [organizationId, documentId]);
    return result.rows[0];
  }

  async restore(
    organizationId: string,
    documentId: string,
    client?: PoolClient
  ): Promise<DocumentEntity> {
    const executor = client || this.db;
    const query = `
      UPDATE app.documents
      SET status = 'active', archived_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 AND id = $2
      RETURNING *;
    `;

    const result = await executor.query(query, [organizationId, documentId]);
    return result.rows[0];
  }

  async list(
    organizationId: string,
    params: DocumentFilterParams
  ): Promise<{ documents: DocumentWithUploaderEntity[]; total: number }> {
    const conditions: string[] = ['d.organization_id = $1'];
    const values: unknown[] = [organizationId];
    let idx = 2;

    // Filter by status (default: active only)
    if (params.status) {
      conditions.push(`d.status = $${idx++}`);
      values.push(params.status);
    } else {
      conditions.push("d.status = 'active'");
    }

    if (params.fileType) {
      conditions.push(`d.file_extension = $${idx++}`);
      values.push(params.fileType);
    }

    if (params.uploadedBy) {
      conditions.push(`d.uploaded_by_user_id = $${idx++}`);
      values.push(params.uploadedBy);
    }

    if (params.dateFrom) {
      conditions.push(`d.created_at >= $${idx++}`);
      values.push(new Date(params.dateFrom));
    }

    if (params.dateTo) {
      conditions.push(`d.created_at <= $${idx++}`);
      values.push(new Date(params.dateTo));
    }

    if (params.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(`(d.display_name ILIKE $${idx} OR d.original_filename ILIKE $${idx})`);
      values.push(searchPattern);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM app.documents d
      WHERE ${whereClause};
    `;

    const sortFieldMap: Record<string, string> = {
      created_at: 'd.created_at',
      updated_at: 'd.updated_at',
      display_name: 'd.display_name',
      size_bytes: 'd.size_bytes',
    };
    const sortColumn = sortFieldMap[params.sortBy || 'created_at'] || 'd.created_at';
    const sortDirection = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT 
        d.*,
        u.name AS uploader_name,
        u.email AS uploader_email
      FROM app.documents d
      JOIN app.users u ON d.uploaded_by_user_id = u.id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    const dataValues = [...values, limit, offset];

    const [countRes, dataRes] = await Promise.all([
      this.db.query(countQuery, values),
      this.db.query(dataQuery, dataValues),
    ]);

    return {
      total: countRes.rows[0]?.total || 0,
      documents: dataRes.rows,
    };
  }

  async delete(organizationId: string, documentId: string, client?: PoolClient): Promise<boolean> {
    const executor = client || this.db;
    const query = `
      DELETE FROM app.documents
      WHERE organization_id = $1 AND id = $2;
    `;
    const res = await executor.query(query, [organizationId, documentId]);
    return (res.rowCount ?? 0) > 0;
  }

  toSafeDocument(doc: DocumentWithUploaderEntity): SafeDocument {
    return {
      id: doc.id,
      organizationId: doc.organization_id,
      uploadedByUserId: doc.uploaded_by_user_id,
      originalFilename: doc.original_filename,
      displayName: doc.display_name,
      description: doc.description,
      fileExtension: doc.file_extension,
      mimeType: doc.mime_type,
      sizeBytes: parseInt(String(doc.size_bytes), 10),
      sha256Checksum: doc.sha256_checksum,
      status: doc.status,
      processingStatus: doc.processing_status || 'pending',
      processingGeneration: doc.processing_generation || 1,
      processingPipelineVersion: doc.processing_pipeline_version || null,
      pageCount: doc.page_count ?? null,
      extractedCharCount: doc.extracted_char_count
        ? parseInt(String(doc.extracted_char_count), 10)
        : null,
      chunkCount: doc.chunk_count || 0,
      processingErrorCode: doc.processing_error_code || null,
      processedAt: doc.processed_at ? doc.processed_at.toISOString() : null,
      embeddingStatus: doc.embedding_status || 'pending',
      embeddingGeneration: doc.embedding_generation || 0,
      embeddingProvider: doc.embedding_provider || null,
      embeddingModel: doc.embedding_model || null,
      embeddingDimensions: doc.embedding_dimensions || null,
      embeddedChunkCount: doc.embedded_chunk_count || 0,
      embeddingErrorCode: doc.embedding_error_code || null,
      embeddedAt: doc.embedded_at ? doc.embedded_at.toISOString() : null,
      createdAt: doc.created_at.toISOString(),
      updatedAt: doc.updated_at.toISOString(),
      archivedAt: doc.archived_at ? doc.archived_at.toISOString() : null,
      uploader: doc.uploader_name
        ? {
            id: doc.uploaded_by_user_id,
            name: doc.uploader_name,
            email: doc.uploader_email || '',
          }
        : undefined,
    };
  }
}

export const documentRepository = new DocumentRepository();
