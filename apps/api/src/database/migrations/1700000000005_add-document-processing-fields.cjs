/**
 * Migration: Add Document Processing Pipeline Fields to app.documents
 * Target Schema: app
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = pgm => {
  pgm.sql(`
    ALTER TABLE app.documents
      ADD COLUMN IF NOT EXISTS processing_status VARCHAR(30) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS processing_generation INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS processing_pipeline_version VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS processing_attempts INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS page_count INTEGER NULL,
      ADD COLUMN IF NOT EXISTS extracted_char_count BIGINT NULL,
      ADD COLUMN IF NOT EXISTS chunk_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS processing_error_code VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS processing_updated_at TIMESTAMPTZ NULL;

    ALTER TABLE app.documents
      DROP CONSTRAINT IF EXISTS chk_document_processing_status,
      DROP CONSTRAINT IF EXISTS chk_document_processing_generation,
      DROP CONSTRAINT IF EXISTS chk_document_processing_attempts,
      DROP CONSTRAINT IF EXISTS chk_document_chunk_count;

    ALTER TABLE app.documents
      ADD CONSTRAINT chk_document_processing_status
        CHECK (processing_status IN ('pending', 'queued', 'processing', 'completed', 'failed')),
      ADD CONSTRAINT chk_document_processing_generation
        CHECK (processing_generation >= 1),
      ADD CONSTRAINT chk_document_processing_attempts
        CHECK (processing_attempts >= 0),
      ADD CONSTRAINT chk_document_chunk_count
        CHECK (chunk_count >= 0);

    CREATE INDEX IF NOT EXISTS idx_documents_org_proc_status
      ON app.documents (organization_id, processing_status);

    CREATE INDEX IF NOT EXISTS idx_documents_proc_status
      ON app.documents (processing_status);

    CREATE INDEX IF NOT EXISTS idx_documents_org_id_generation
      ON app.documents (organization_id, id, processing_generation);
  `);
};

exports.down = pgm => {
  pgm.sql(`
    DROP INDEX IF EXISTS app.idx_documents_org_id_generation;
    DROP INDEX IF EXISTS app.idx_documents_proc_status;
    DROP INDEX IF EXISTS app.idx_documents_org_proc_status;

    ALTER TABLE app.documents
      DROP CONSTRAINT IF EXISTS chk_document_chunk_count,
      DROP CONSTRAINT IF EXISTS chk_document_processing_attempts,
      DROP CONSTRAINT IF EXISTS chk_document_processing_generation,
      DROP CONSTRAINT IF EXISTS chk_document_processing_status;

    ALTER TABLE app.documents
      DROP COLUMN IF EXISTS processing_updated_at,
      DROP COLUMN IF EXISTS processing_started_at,
      DROP COLUMN IF EXISTS processed_at,
      DROP COLUMN IF EXISTS processing_error_code,
      DROP COLUMN IF EXISTS chunk_count,
      DROP COLUMN IF EXISTS extracted_char_count,
      DROP COLUMN IF EXISTS page_count,
      DROP COLUMN IF EXISTS processing_attempts,
      DROP COLUMN IF EXISTS processing_pipeline_version,
      DROP COLUMN IF EXISTS processing_generation,
      DROP COLUMN IF EXISTS processing_status;
  `);
};
