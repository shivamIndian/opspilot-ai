/**
 * Migration: Create Enterprise Document Management Tables
 * Target Schema: app
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = pgm => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app.documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
      uploaded_by_user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
      original_filename VARCHAR(255) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      file_extension VARCHAR(20) NOT NULL,
      mime_type VARCHAR(150) NOT NULL,
      size_bytes BIGINT NOT NULL,
      sha256_checksum VARCHAR(64) NOT NULL,
      storage_provider VARCHAR(30) NOT NULL DEFAULT 'local',
      storage_key TEXT NOT NULL UNIQUE,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived_at TIMESTAMPTZ NULL,
      CONSTRAINT chk_document_status CHECK (status IN ('active', 'archived')),
      CONSTRAINT chk_document_size CHECK (size_bytes > 0),
      CONSTRAINT chk_document_storage_provider CHECK (storage_provider IN ('local', 's3')),
      CONSTRAINT chk_document_extension CHECK (file_extension IN ('pdf', 'docx', 'txt', 'md'))
    );

    CREATE INDEX IF NOT EXISTS idx_documents_org_id ON app.documents (organization_id);
    CREATE INDEX IF NOT EXISTS idx_documents_uploader ON app.documents (uploaded_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON app.documents (status);
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON app.documents (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_documents_org_status ON app.documents (organization_id, status);
    CREATE INDEX IF NOT EXISTS idx_documents_org_extension ON app.documents (organization_id, file_extension);
    CREATE INDEX IF NOT EXISTS idx_documents_checksum ON app.documents (sha256_checksum);
  `);
};

exports.down = pgm => {
  pgm.sql(`
    DROP TABLE IF EXISTS app.documents CASCADE;
  `);
};
