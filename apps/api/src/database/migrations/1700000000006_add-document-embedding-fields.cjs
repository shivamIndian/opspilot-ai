/**
 * Migration: Add Document Embedding Pipeline Fields to app.documents
 * Target Schema: app
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = pgm => {
  pgm.sql(`
    ALTER TABLE app.documents
      ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(30) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS embedding_generation INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS embedding_provider VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(150) NULL,
      ADD COLUMN IF NOT EXISTS embedding_dimensions INTEGER NULL,
      ADD COLUMN IF NOT EXISTS embedded_chunk_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS embedding_error_code VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS embedding_started_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ NULL;

    ALTER TABLE app.documents
      DROP CONSTRAINT IF EXISTS chk_document_embedding_status,
      DROP CONSTRAINT IF EXISTS chk_document_embedding_generation,
      DROP CONSTRAINT IF EXISTS chk_document_embedded_chunk_count;

    ALTER TABLE app.documents
      ADD CONSTRAINT chk_document_embedding_status
        CHECK (embedding_status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'skipped')),
      ADD CONSTRAINT chk_document_embedding_generation
        CHECK (embedding_generation >= 0),
      ADD CONSTRAINT chk_document_embedded_chunk_count
        CHECK (embedded_chunk_count >= 0);

    CREATE INDEX IF NOT EXISTS idx_documents_org_emb_status
      ON app.documents (organization_id, embedding_status);

    CREATE INDEX IF NOT EXISTS idx_documents_emb_status
      ON app.documents (embedding_status);

    CREATE INDEX IF NOT EXISTS idx_documents_org_id_emb_gen
      ON app.documents (organization_id, id, embedding_generation);
  `);
};

exports.down = pgm => {
  pgm.sql(`
    DROP INDEX IF EXISTS app.idx_documents_org_id_emb_gen;
    DROP INDEX IF EXISTS app.idx_documents_emb_status;
    DROP INDEX IF EXISTS app.idx_documents_org_emb_status;

    ALTER TABLE app.documents
      DROP CONSTRAINT IF EXISTS chk_document_embedded_chunk_count,
      DROP CONSTRAINT IF EXISTS chk_document_embedding_generation,
      DROP CONSTRAINT IF EXISTS chk_document_embedding_status;

    ALTER TABLE app.documents
      DROP COLUMN IF EXISTS embedding_updated_at,
      DROP COLUMN IF EXISTS embedded_at,
      DROP COLUMN IF EXISTS embedding_started_at,
      DROP COLUMN IF EXISTS embedding_error_code,
      DROP COLUMN IF EXISTS embedded_chunk_count,
      DROP COLUMN IF EXISTS embedding_dimensions,
      DROP COLUMN IF EXISTS embedding_model,
      DROP COLUMN IF EXISTS embedding_provider,
      DROP COLUMN IF EXISTS embedding_generation,
      DROP COLUMN IF EXISTS embedding_status;
  `);
};
