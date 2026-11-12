/**
 * Baseline migration establishing and verifying the 'app' schema for OpsPilot API.
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = pgm => {
  pgm.sql('CREATE SCHEMA IF NOT EXISTS app;');
  pgm.sql("COMMENT ON SCHEMA app IS 'OpsPilot Core Business & API Data Domain';");
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = pgm => {
  // Do not drop schema in baseline rollback to protect tenant data integrity
  pgm.sql('COMMENT ON SCHEMA app IS NULL;');
};
