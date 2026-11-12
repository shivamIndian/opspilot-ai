import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../database/index.js';
import type {
  DocumentProcessingStatus,
  UpdateProcessingStatusParams,
  DocumentProcessingStatusResponse,
} from './document-processing.types.js';

export class DocumentProcessingRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  /**
   * Concurrency-safe status update verifying that only matching processing generations
   * apply updates, and preventing archived documents from becoming active.
   */
  async updateStatus(
    organizationId: string,
    documentId: string,
    expectedGeneration: number,
    params: UpdateProcessingStatusParams,
    client?: PoolClient
  ): Promise<boolean> {
    const executor = client || this.db;

    const updates: string[] = [
      'processing_status = $4',
      'processing_updated_at = CURRENT_TIMESTAMP',
    ];
    const values: unknown[] = [organizationId, documentId, expectedGeneration, params.status];
    let idx = 5;

    if (params.attempts !== undefined) {
      updates.push(`processing_attempts = $${idx++}`);
      values.push(params.attempts);
    }
    if (params.startedAt !== undefined) {
      updates.push(`processing_started_at = $${idx++}`);
      values.push(params.startedAt);
    }
    if (params.completedAt !== undefined) {
      updates.push(`processed_at = $${idx++}`);
      values.push(params.completedAt);
    }
    if (params.pageCount !== undefined) {
      updates.push(`page_count = $${idx++}`);
      values.push(params.pageCount);
    }
    if (params.extractedCharCount !== undefined) {
      updates.push(`extracted_char_count = $${idx++}`);
      values.push(params.extractedCharCount);
    }
    if (params.chunkCount !== undefined) {
      updates.push(`chunk_count = $${idx++}`);
      values.push(params.chunkCount);
    }
    if (params.errorCode !== undefined) {
      updates.push(`processing_error_code = $${idx++}`);
      values.push(params.errorCode);
    }
    if (params.pipelineVersion !== undefined) {
      updates.push(`processing_pipeline_version = $${idx++}`);
      values.push(params.pipelineVersion);
    }

    const query = `
      UPDATE app.documents
      SET ${updates.join(', ')}
      WHERE organization_id = $1 
        AND id = $2 
        AND processing_generation = $3
      RETURNING id;
    `;

    const result = await executor.query(query, values);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Atomically increments the processing generation and sets status to 'queued'
   * for an authorized manual or automatic reprocessing request.
   */
  async incrementGenerationAndSetQueued(
    organizationId: string,
    documentId: string,
    pipelineVersion: string,
    client?: PoolClient
  ): Promise<{ generation: number; status: DocumentProcessingStatus } | null> {
    const executor = client || this.db;

    const query = `
      UPDATE app.documents
      SET 
        processing_generation = processing_generation + 1,
        processing_status = 'queued',
        processing_pipeline_version = $3,
        processing_attempts = 0,
        processing_error_code = NULL,
        processing_started_at = NULL,
        processed_at = NULL,
        processing_updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 
        AND id = $2
        AND status = 'active'
        AND processing_status != 'processing'
      RETURNING processing_generation, processing_status;
    `;

    const result = await executor.query(query, [organizationId, documentId, pipelineVersion]);
    if (result.rows.length === 0) {
      return null;
    }

    return {
      generation: result.rows[0].processing_generation,
      status: result.rows[0].processing_status,
    };
  }

  /**
   * Retrieves processing status fields for a specific document.
   */
  async getStatus(
    organizationId: string,
    documentId: string
  ): Promise<DocumentProcessingStatusResponse | null> {
    const query = `
      SELECT 
        processing_status,
        processing_generation,
        processing_pipeline_version,
        page_count,
        extracted_char_count,
        chunk_count,
        processed_at,
        processing_started_at,
        processing_error_code
      FROM app.documents
      WHERE organization_id = $1 AND id = $2;
    `;

    const result = await this.db.query(query, [organizationId, documentId]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      status: row.processing_status,
      generation: row.processing_generation,
      pipelineVersion: row.processing_pipeline_version,
      pageCount: row.page_count,
      extractedCharCount: row.extracted_char_count ? parseInt(row.extracted_char_count, 10) : null,
      chunkCount: row.chunk_count || 0,
      processedAt: row.processed_at ? row.processed_at.toISOString() : null,
      processingStartedAt: row.processing_started_at
        ? row.processing_started_at.toISOString()
        : null,
      errorCode: row.processing_error_code,
    };
  }
}

export const documentProcessingRepository = new DocumentProcessingRepository();
