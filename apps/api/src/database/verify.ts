import { pool, checkDatabaseHealth, getSanitizedDatabaseUrl } from './index.js';
import { config } from '../config/env.js';

async function main() {
  console.log('=== Verifying Node.js PostgreSQL Connection ===');
  console.log(`Connecting to: ${getSanitizedDatabaseUrl(config.DATABASE_URL)}`);

  const health = await checkDatabaseHealth();
  if (health.status !== 'up') {
    console.error('❌ Database health check failed:', health.error);
    process.exit(1);
  }

  console.log(`✅ Connection successful! Latency: ${health.latencyMs}ms`);

  const client = await pool.connect();
  try {
    // 1. Check current role and schema
    const roleRes = await client.query('SELECT current_user, current_schema();');
    console.log(
      `✅ Current Role: ${roleRes.rows[0].current_user}, Current Schema: ${roleRes.rows[0].current_schema}`
    );

    // 2. Check pgvector extension availability
    const vectorRes = await client.query(
      "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
    );
    if (vectorRes.rows.length > 0) {
      console.log(`✅ pgvector Extension verified: v${vectorRes.rows[0].extversion}`);
    } else {
      console.warn('⚠️ pgvector extension is NOT installed in opspilot_db.');
    }

    // 3. Verify app schema write access
    await client.query(
      'CREATE TABLE IF NOT EXISTS app._verify_probe (id serial primary key, verified_at timestamptz default now());'
    );
    await client.query('INSERT INTO app._verify_probe DEFAULT VALUES;');
    const probeCount = await client.query('SELECT count(*) FROM app._verify_probe;');
    console.log(`✅ Schema 'app' write test passed (probe records: ${probeCount.rows[0].count})`);
    await client.query('DROP TABLE IF EXISTS app._verify_probe;');
    console.log("✅ Schema 'app' cleanup completed.");
  } finally {
    client.release();
    await pool.end();
  }

  console.log('=== Node.js PostgreSQL Verification Completed Successfully ===');
}

main().catch(err => {
  console.error('❌ Verification failed:', err.message);
  process.exit(1);
});
