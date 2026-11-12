import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../database/index.js';
import type { DocumentEmbeddingStatus } from '../types/document.types.js';
import type {
  UpdateEmbeddingStatusParams,
  DocumentEmbeddingStatusResponse,
} from './embedding.types.js';

export class DocumentEmbeddingRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  /**
   * Concurrency-safe status update verifying that only matching embedding generations
   * apply updates, preventing older jobs from overwriting newer runs.
   */
  async updateStatus(
    organizationId: string,
    documentId: string,
    expectedGeneration: number,
    params: UpdateEmbeddingStatusParams,
    client?: PoolClient
  ): Promise<boolean> {
    const executor = client || this.db;

    const updates: string[] = ['embedding_status = $4', 'embedding_updated_at = CURRENT_TIMESTAMP'];
    const values: unknown[] = [organizationId, documentId, expectedGeneration, params.status];
    let idx = 5;

    if (params.provider !== undefined) {
      updates.push(`embedding_provider = $${idx++}`);
      values.push(params.provider);
    }
    if (params.model !== undefined) {
      updates.push(`embedding_model = $${idx++}`);
      values.push(params.model);
    }
    if (params.dimensions !== undefined) {
      updates.push(`embedding_dimensions = $${idx++}`);
      values.push(params.dimensions);
    }
    if (params.embeddedChunkCount !== undefined) {
      updates.push(`embedded_chunk_count = $${idx++}`);
      values.push(params.embeddedChunkCount);
    }
    if (params.errorCode !== undefined) {
      updates.push(`embedding_error_code = $${idx++}`);
      values.push(params.errorCode);
    }
    if (params.startedAt !== undefined) {
      updates.push(`embedding_started_at = $${idx++}`);
      values.push(params.startedAt);
    }
    if (params.embeddedAt !== undefined) {
      updates.push(`embedded_at = $${idx++}`);
      values.push(params.embeddedAt);
    }

    const query = `
      UPDATE app.documents
      SET ${updates.join(', ')}
      WHERE organization_id = $1 
        AND id = $2 
        AND embedding_generation = $3
      RETURNING id;
    `;

    const result = await executor.query(query, values);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Atomically increments the embedding generation and sets status to 'queued'
   * for an authorized manual or automatic embedding generation request.
   */
  async incrementGenerationAndSetQueued(
    organizationId: string,
    documentId: string,
    provider: string,
    model: string,
    dimensions: number,
    client?: PoolClient
  ): Promise<{ generation: number; status: DocumentEmbeddingStatus } | null> {
    const executor = client || this.db;

    const query = `
      UPDATE app.documents
      SET 
        embedding_generation = embedding_generation + 1,
        embedding_status = 'queued',
        embedding_provider = $3,
        embedding_model = $4,
        embedding_dimensions = $5,
        embedding_error_code = NULL,
        embedding_started_at = NULL,
        embedded_at = NULL,
        embedding_updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 
        AND id = $2
        AND status = 'active'
        AND processing_status = 'completed'
        AND embedding_status != 'processing'
      RETURNING embedding_generation, embedding_status;
    `;

    const result = await executor.query(query, [
      organizationId,
      documentId,
      provider,
      model,
      dimensions,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      generation: result.rows[0].embedding_generation,
      status: result.rows[0].embedding_status,
    };
  }

  /**
   * Retrieves current embedding status, generation, and metrics for a document.
   */
  async getStatus(
    organizationId: string,
    documentId: string,
    client?: PoolClient
  ): Promise<DocumentEmbeddingStatusResponse | null> {
    const executor = client || this.db;

    const query = `
      SELECT 
        id,
        embedding_status,
        embedding_generation,
        embedding_provider,
        embedding_model,
        embedding_dimensions,
        embedded_chunk_count,
        embedding_error_code,
        embedding_started_at,
        embedded_at,
        embedding_updated_at
      FROM app.documents
      WHERE organization_id = $1 AND id = $2;
    `;

    const result = await executor.query(query, [organizationId, documentId]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      documentId: row.id,
      status: row.embedding_status,
      generation: row.embedding_generation,
      provider: row.embedding_provider,
      model: row.embedding_model,
      dimensions: row.embedding_dimensions,
      embeddedChunkCount: row.embedded_chunk_count || 0,
      errorCode: row.embedding_error_code,
      startedAt: row.embedding_started_at ? row.embedding_started_at.toISOString() : null,
      embeddedAt: row.embedded_at ? row.embedded_at.toISOString() : null,
      updatedAt: row.embedding_updated_at ? row.embedding_updated_at.toISOString() : null,
    };
  }
}

export const documentEmbeddingRepository = new DocumentEmbeddingRepository();
