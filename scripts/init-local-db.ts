/**
 * OpsPilot AI - Local PostgreSQL Database & Application Roles Setup Script
 *
 * Connects to PostgreSQL administrator account, provisions the opspilot_db database,
 * creates the least-privilege opspilot_api and opspilot_ai application roles,
 * initializes the app and ai schemas, sets permissions and default privileges,
 * and verifies connections without exposing sensitive credentials.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Helper to parse env file safely
const loadEnvFile = (filePath: string): Record<string, string> => {
  const env: Record<string, string> = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
        if (match) {
          env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  }
  return env;
};

async function main() {
  console.log('======================================================================');
  console.log('>> OpsPilot AI - Local PostgreSQL Database & Roles Initialization <<');
  console.log('======================================================================');

  const rootDir = path.resolve(__dirname, '..');
  const rootEnv = loadEnvFile(path.join(rootDir, '.env'));
  const apiEnv = loadEnvFile(path.join(rootDir, 'apps', 'api', '.env'));
  const aiEnv = loadEnvFile(path.join(rootDir, 'apps', 'ai-service', '.env'));

  // Target Database parameters
  const dbHost = process.env.POSTGRES_HOST || 'localhost';
  const dbPort = parseInt(process.env.POSTGRES_PORT || rootEnv.POSTGRES_PORT || '5432', 10);
  const targetDbName = rootEnv.POSTGRES_DB || 'opspilot_db';

  // Admin user connection
  const adminUser = process.env.PGUSER || process.env.POSTGRES_ADMIN_USER || 'postgres';
  const adminPassword = process.env.PGPASSWORD || process.env.POSTGRES_ADMIN_PASSWORD || undefined;

  // Extract application credentials safely
  const apiDbUser = rootEnv.API_DB_USER || 'opspilot_api';
  let apiDbPassword = rootEnv.API_DB_PASSWORD;
  if (!apiDbPassword && apiEnv.DATABASE_URL) {
    try {
      const u = new URL(apiEnv.DATABASE_URL);
      apiDbPassword = decodeURIComponent(u.password);
    } catch {}
  }
  apiDbPassword = apiDbPassword || 'change_this_api_password';

  const aiDbUser = rootEnv.AI_DB_USER || 'opspilot_ai';
  let aiDbPassword = rootEnv.AI_DB_PASSWORD;
  if (!aiDbPassword && aiEnv.AI_DATABASE_URL) {
    try {
      const cleanUrl = aiEnv.AI_DATABASE_URL.replace('postgresql+asyncpg://', 'http://');
      const u = new URL(cleanUrl);
      aiDbPassword = decodeURIComponent(u.password);
    } catch {}
  }
  aiDbPassword = aiDbPassword || 'change_this_ai_password';

  console.log(`[INFO] PostgreSQL Host:    ${dbHost}:${dbPort}`);
  console.log(`[INFO] Target Database:    ${targetDbName}`);
  console.log(`[INFO] Administrator User: ${adminUser}`);
  console.log(`[INFO] API Role Target:    ${apiDbUser} (Schema: app)`);
  console.log(`[INFO] AI Service Target:  ${aiDbUser} (Schema: ai)`);

  // Step 1: Connect to maintenance database ('postgres') to ensure targetDb exists
  console.log('\n[1/5] Connecting to PostgreSQL instance as administrator...');
  const adminClient = new Client({
    host: dbHost,
    port: dbPort,
    user: adminUser,
    password: adminPassword,
    database: 'postgres',
  });

  await adminClient.connect();

  const verRes = await adminClient.query('SELECT version();');
  console.log(`[INFO] Detected: ${verRes.rows[0].version}`);

  const dbCheck = await adminClient.query(
    'SELECT 1 FROM pg_database WHERE datname = $1;',
    [targetDbName]
  );

  if (dbCheck.rowCount === 0) {
    console.log(`[INFO] Creating database "${targetDbName}"...`);
    await adminClient.query(`CREATE DATABASE "${targetDbName}";`);
    console.log(`[SUCCESS] Database "${targetDbName}" created.`);
  } else {
    console.log(`[INFO] Database "${targetDbName}" already exists.`);
  }

  // Helper to escape SQL string literals safely for DDL
  const escapeLiteral = (val: string) => "'" + val.replace(/'/g, "''") + "'";

  // Step 2: Provision login roles
  console.log('\n[2/5] Provisioning least-privilege login roles...');

  // opspilot_api role
  const checkApiRole = await adminClient.query(
    'SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1;',
    [apiDbUser]
  );
  if (checkApiRole.rowCount === 0) {
    await adminClient.query(
      `CREATE ROLE "${apiDbUser}" WITH LOGIN PASSWORD ${escapeLiteral(apiDbPassword)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;`
    );
    console.log(`[SUCCESS] Role "${apiDbUser}" created successfully.`);
  } else {
    await adminClient.query(
      `ALTER ROLE "${apiDbUser}" WITH LOGIN PASSWORD ${escapeLiteral(apiDbPassword)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;`
    );
    console.log(`[SUCCESS] Role "${apiDbUser}" verified and attributes updated.`);
  }

  // opspilot_ai role
  const checkAiRole = await adminClient.query(
    'SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1;',
    [aiDbUser]
  );
  if (checkAiRole.rowCount === 0) {
    await adminClient.query(
      `CREATE ROLE "${aiDbUser}" WITH LOGIN PASSWORD ${escapeLiteral(aiDbPassword)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;`
    );
    console.log(`[SUCCESS] Role "${aiDbUser}" created successfully.`);
  } else {
    await adminClient.query(
      `ALTER ROLE "${aiDbUser}" WITH LOGIN PASSWORD ${escapeLiteral(aiDbPassword)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;`
    );
    console.log(`[SUCCESS] Role "${aiDbUser}" verified and attributes updated.`);
  }

  // Grant connect and create on database
  await adminClient.query(`GRANT CONNECT, CREATE ON DATABASE "${targetDbName}" TO "${apiDbUser}";`);
  await adminClient.query(`GRANT CONNECT, CREATE ON DATABASE "${targetDbName}" TO "${aiDbUser}";`);
  console.log(`[SUCCESS] Database CONNECT & CREATE permissions granted to both roles.`);

  await adminClient.end();

  // Step 3: Connect to targetDb to configure schemas and default privileges
  console.log(`\n[3/5] Configuring schemas and access privileges in "${targetDbName}"...`);
  const dbClient = new Client({
    host: dbHost,
    port: dbPort,
    user: adminUser,
    password: adminPassword,
    database: targetDbName,
  });

  await dbClient.connect();

  // Check pgvector
  const vectorCheck = await dbClient.query(
    "SELECT 1 FROM pg_available_extensions WHERE name = 'vector';"
  );
  if (vectorCheck.rowCount && vectorCheck.rowCount > 0) {
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('[SUCCESS] pgvector extension enabled.');
  } else {
    console.log('[INFO] pgvector extension not present in engine; skipping extension setup.');
  }

  // Secure public schema
  await dbClient.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC;');
  await dbClient.query(`GRANT USAGE ON SCHEMA public TO "${apiDbUser}", "${aiDbUser}";`);

  // Schema: app
  await dbClient.query(`CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION "${apiDbUser}";`);
  await dbClient.query(`ALTER ROLE "${apiDbUser}" SET search_path TO app, public;`);
  await dbClient.query(`GRANT USAGE, CREATE ON SCHEMA app TO "${apiDbUser}";`);
  await dbClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO "${apiDbUser}";`);
  await dbClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app TO "${apiDbUser}";`);
  await dbClient.query(`GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA app TO "${apiDbUser}";`);

  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${apiDbUser}" IN SCHEMA app GRANT ALL ON TABLES TO "${apiDbUser}";`);
  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${apiDbUser}" IN SCHEMA app GRANT ALL ON SEQUENCES TO "${apiDbUser}";`);
  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${apiDbUser}" IN SCHEMA app GRANT ALL ON ROUTINES TO "${apiDbUser}";`);

  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${adminUser}" IN SCHEMA app GRANT ALL ON TABLES TO "${apiDbUser}";`);
  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${adminUser}" IN SCHEMA app GRANT ALL ON SEQUENCES TO "${apiDbUser}";`);
  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${adminUser}" IN SCHEMA app GRANT ALL ON ROUTINES TO "${apiDbUser}";`);
  console.log(`[SUCCESS] Schema "app" provisioned and granted to "${apiDbUser}".`);

  // Schema: ai
  await dbClient.query(`CREATE SCHEMA IF NOT EXISTS ai AUTHORIZATION "${aiDbUser}";`);
  await dbClient.query(`ALTER ROLE "${aiDbUser}" SET search_path TO ai, public;`);
  await dbClient.query(`GRANT USAGE, CREATE ON SCHEMA ai TO "${aiDbUser}";`);
  await dbClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ai TO "${aiDbUser}";`);
  await dbClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ai TO "${aiDbUser}";`);
  await dbClient.query(`GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA ai TO "${aiDbUser}";`);

  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${aiDbUser}" IN SCHEMA ai GRANT ALL ON TABLES TO "${aiDbUser}";`);
  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${aiDbUser}" IN SCHEMA ai GRANT ALL ON SEQUENCES TO "${aiDbUser}";`);
  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${aiDbUser}" IN SCHEMA ai GRANT ALL ON ROUTINES TO "${aiDbUser}";`);

  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${adminUser}" IN SCHEMA ai GRANT ALL ON TABLES TO "${aiDbUser}";`);
  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${adminUser}" IN SCHEMA ai GRANT ALL ON SEQUENCES TO "${aiDbUser}";`);
  await dbClient.query(`ALTER DEFAULT PRIVILEGES FOR ROLE "${adminUser}" IN SCHEMA ai GRANT ALL ON ROUTINES TO "${aiDbUser}";`);
  console.log(`[SUCCESS] Schema "ai" provisioned and granted to "${aiDbUser}".`);

  // Cross-schema isolation
  await dbClient.query(`REVOKE ALL ON SCHEMA ai FROM "${apiDbUser}";`);
  await dbClient.query(`REVOKE ALL ON SCHEMA app FROM "${aiDbUser}";`);
  console.log(`[SUCCESS] Cross-schema tenant isolation enforced.`);

  await dbClient.end();

  // Step 4: Verify connectivity as opspilot_api
  console.log(`\n[4/5] Verifying "${apiDbUser}" connectivity & write permissions...`);
  const apiClient = new Client({
    host: dbHost,
    port: dbPort,
    user: apiDbUser,
    password: apiDbPassword,
    database: targetDbName,
  });

  await apiClient.connect();
  const apiTest = await apiClient.query('SELECT current_user, current_schema();');
  console.log(`[VERIFIED] User: ${apiTest.rows[0].current_user}, Schema: ${apiTest.rows[0].current_schema}`);

  // Test table creation and drop in schema app
  await apiClient.query('CREATE TABLE IF NOT EXISTS app._init_probe (id int primary key);');
  await apiClient.query('DROP TABLE IF EXISTS app._init_probe;');
  console.log(`[VERIFIED] Schema "app" write & DDL permissions confirmed.`);
  await apiClient.end();

  // Step 5: Verify connectivity as opspilot_ai
  console.log(`\n[5/5] Verifying "${aiDbUser}" connectivity & write permissions...`);
  const aiClient = new Client({
    host: dbHost,
    port: dbPort,
    user: aiDbUser,
    password: aiDbPassword,
    database: targetDbName,
  });

  await aiClient.connect();
  const aiTest = await aiClient.query('SELECT current_user, current_schema();');
  console.log(`[VERIFIED] User: ${aiTest.rows[0].current_user}, Schema: ${aiTest.rows[0].current_schema}`);

  // Test table creation and drop in schema ai (essential for LangGraph checkpoint setup)
  await aiClient.query('CREATE TABLE IF NOT EXISTS ai._init_probe (id int primary key);');
  await aiClient.query('DROP TABLE IF EXISTS ai._init_probe;');
  console.log(`[VERIFIED] Schema "ai" write & DDL permissions confirmed.`);
  await aiClient.end();

  console.log('\n======================================================================');
  console.log('>> [ALL COMPLETED] PostgreSQL Roles & Schemas Initialized Cleanly! <<');
  console.log('======================================================================\n');
}

main().catch(err => {
  console.error('\n[FATAL ERROR] Database initialization failed:', err.message);
  process.exit(1);
});
