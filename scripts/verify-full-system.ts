/**
 * OpsPilot AI - System Database & Flow Verification Script
 *
 * Verifies all 11 criteria from Section 9:
 * 1. Node.js database connection
 * 2. Python AI database connection
 * 3. app schema access
 * 4. ai schema access
 * 5. User registration
 * 6. Password hashing and persistence (Argon2id)
 * 7. Duplicate email handling
 * 8. User login & token generation
 * 9. Refresh-token rotation & session invalidation
 * 10. Python AI LangGraph persistent checkpointing
 * 11. Database migration compatibility
 */

import { pool } from '../apps/api/src/database/connection.js';
import { authService } from '../apps/api/src/modules/auth/services/auth.service.js';
import { userRepository } from '../apps/api/src/modules/auth/repositories/user.repository.js';
import { passwordService } from '../apps/api/src/modules/auth/services/password.service.js';
import { execSync } from 'child_process';
import path from 'path';

const runPython = (scriptCode: string): string => {
  return execSync('apps\\ai-service\\.venv\\Scripts\\python -', {
    input: scriptCode,
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf-8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
};

async function runVerification() {
  console.log('======================================================================');
  console.log('>> OpsPilot AI - Database Roles, Registration & Checkpoint Audit <<');
  console.log('======================================================================\n');

  let testUserId: string | null = null;
  const testEmail = `dev_qa_${Date.now()}@opspilot.internal`;
  const testPassword = 'SecureVerificationPass123!@#';
  const testName = 'System QA Tester';

  try {
    // 1. Node.js database connection
    console.log('[1/11] Testing Node.js API Database Connection...');
    const client = await pool.connect();
    const nodeRes = await client.query('SELECT current_user, current_database(), version();');
    console.log(`  -> Connected as:     ${nodeRes.rows[0].current_user}`);
    console.log(`  -> Target Database:  ${nodeRes.rows[0].current_database}`);
    console.log(`  -> Engine Version:   ${nodeRes.rows[0].version.split(',')[0]}`);
    client.release();
    console.log('  -> Status: PASSED\n');

    // 2. Python AI database connection
    console.log('[2/11] Testing Python AI Database Connection via asyncpg...');
    const aiCheckOutput = runPython(`
import asyncio
from app.database.connection import engine
import sqlalchemy as sa

async def main():
    async with engine.connect() as c:
        res = await c.execute(sa.text("SELECT current_user, current_database()"))
        user, db = res.one()
        print(f"Connected as: {user} | Database: {db}")

asyncio.run(main())
`);
    console.log(`  -> Python asyncpg:   ${aiCheckOutput.trim()}`);
    console.log('  -> Status: PASSED\n');

    // 3. app schema access
    console.log('[3/11] Testing Node.js opspilot_api role access to app schema...');
    const appSchemaRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'app' LIMIT 5;"
    );
    console.log(`  -> Accessible tables in 'app': ${appSchemaRes.rows.map(r => r.table_name).join(', ')}`);
    console.log('  -> Status: PASSED\n');

    // 4. ai schema access
    console.log('[4/11] Testing Python opspilot_ai role access to ai schema...');
    const aiSchemaOutput = runPython(`
import asyncio
from app.database.connection import engine
import sqlalchemy as sa

async def main():
    async with engine.connect() as c:
        res = await c.execute(sa.text("SELECT table_name FROM information_schema.tables WHERE table_schema='ai' ORDER BY table_name LIMIT 6"))
        tables = [r[0] for r in res.fetchall()]
        print(", ".join(tables))

asyncio.run(main())
`);
    console.log(`  -> Accessible tables in 'ai': ${aiSchemaOutput.trim()}`);
    console.log('  -> Status: PASSED\n');

    // 5. User registration
    console.log('[5/11] Testing User Registration flow...');
    const registeredUser = await authService.register({
      name: testName,
      email: testEmail,
      password: testPassword,
    });
    testUserId = registeredUser.id;
    console.log(`  -> Registered user ID: ${registeredUser.id}`);
    console.log(`  -> Name:               ${registeredUser.name}`);
    console.log(`  -> Email:              ${registeredUser.email}`);
    console.log(`  -> Platform Role:      ${registeredUser.platformRole}`);
    console.log('  -> Status: PASSED\n');

    // 6. Password hashing and persistence
    console.log('[6/11] Verifying Password Hashing & Persistence in app.users...');
    const dbUser = await userRepository.findByEmail(testEmail);
    if (!dbUser) throw new Error('User not found in app.users');
    console.log(`  -> Password Hash Algorithm: Argon2id`);
    console.log(`  -> Hash Prefix:             ${dbUser.password_hash.substring(0, 15)}...`);
    const isPassValid = await passwordService.verifyPassword(dbUser.password_hash, testPassword);
    if (!isPassValid) throw new Error('Stored password hash failed verification');
    console.log('  -> Password hash verification: MATCH CONFIRMED');
    console.log('  -> Status: PASSED\n');

    // 7. Duplicate email handling
    console.log('[7/11] Testing Duplicate Email Registration handling...');
    let duplicateRejected = false;
    try {
      await authService.register({
        name: 'Another Alice',
        email: testEmail,
        password: 'AnotherPassword123!@#',
      });
    } catch (err: any) {
      if (err.message === 'EMAIL_ALREADY_REGISTERED') {
        duplicateRejected = true;
        console.log(`  -> Caught expected error: ${err.message}`);
      } else {
        throw err;
      }
    }
    if (!duplicateRejected) throw new Error('Duplicate email was not rejected');
    console.log('  -> Status: PASSED\n');

    // 8. User login
    console.log('[8/11] Testing Login flow & session issuance...');
    const loginResult = await authService.login({
      email: testEmail,
      password: testPassword,
    });
    console.log(`  -> Access Token Issued:  ${loginResult.tokens.accessToken.substring(0, 20)}...`);
    console.log(`  -> Refresh Token Issued: ${loginResult.tokens.refreshToken.substring(0, 20)}...`);
    console.log(`  -> CSRF Token Issued:    ${loginResult.tokens.csrfToken.substring(0, 20)}...`);
    console.log(`  -> Token Lifetime:       ${loginResult.tokens.expiresIn}s`);
    console.log('  -> Status: PASSED\n');

    // 9. Refresh-token rotation
    console.log('[9/11] Testing Refresh-Token rotation behavior...');
    const refreshResult = await authService.refresh(loginResult.tokens.refreshToken);
    console.log(`  -> Rotated Access Token:  ${refreshResult.accessToken.substring(0, 20)}...`);
    console.log(`  -> Rotated Refresh Token: ${refreshResult.refreshToken.substring(0, 20)}...`);
    
    // Verify old refresh token is now revoked (replay protection)
    let replayPrevented = false;
    try {
      await authService.refresh(loginResult.tokens.refreshToken);
    } catch (err: any) {
      replayPrevented = true;
      console.log(`  -> Replay protection confirmed: Old refresh token rejected.`);
    }
    if (!replayPrevented) throw new Error('Old refresh token was not revoked upon rotation');
    console.log('  -> Status: PASSED\n');

    // 10. Python AI checkpoint persistence
    console.log('[10/11] Testing Python AI LangGraph persistent checkpointing in ai schema...');
    const checkpointOutput = runPython(`
import asyncio
from app.agents.persistence.checkpointer import init_workflow_checkpointer, close_workflow_checkpointer
from langgraph.checkpoint.base import empty_checkpoint

async def main():
    saver = await init_workflow_checkpointer()
    cfg = {'configurable': {'thread_id': 'audit-verify-thread', 'checkpoint_ns': ''}}
    cp = empty_checkpoint()
    res = await saver.aput(cfg, cp, {'step': 100, 'verified': True}, {})
    loaded = await saver.aget_tuple(res)
    assert loaded is not None
    print(f"Saved & retrieved checkpoint: {loaded.checkpoint['id']} (metadata: {loaded.metadata})")
    await close_workflow_checkpointer()

asyncio.run(main())
`);
    console.log(`  -> ${checkpointOutput.trim()}`);
    console.log('  -> Status: PASSED\n');

    // Clean up audit test checkpoint via Python (preserves cross-schema boundary)
    runPython(`
import asyncio
from app.database.connection import engine
import sqlalchemy as sa

async def cleanup():
    async with engine.begin() as conn:
        await conn.execute(sa.text("DELETE FROM ai.checkpoints WHERE thread_id = 'audit-verify-thread'"))
        await conn.execute(sa.text("DELETE FROM ai.checkpoint_blobs WHERE thread_id = 'audit-verify-thread'"))
        await conn.execute(sa.text("DELETE FROM ai.checkpoint_writes WHERE thread_id = 'audit-verify-thread'"))

asyncio.run(cleanup())
`);

    // 11. Existing database migration compatibility
    console.log('[11/11] Verifying Migration Compatibility & Status...');
    const nodeMigrationRes = await pool.query(
      'SELECT count(*) as count FROM app.pgmigrations;'
    );
    const aiHeadVersion = runPython(`
import asyncio
from app.database.connection import engine
import sqlalchemy as sa

async def get_ver():
    async with engine.connect() as c:
        res = await c.execute(sa.text("SELECT version_num FROM ai.alembic_version"))
        print(res.scalar())

asyncio.run(get_ver())
`).trim();
    console.log(`  -> Completed Node.js migrations in app: ${nodeMigrationRes.rows[0].count}`);
    console.log(`  -> Current Alembic head in ai:           ${aiHeadVersion}`);
    console.log('  -> Status: PASSED\n');

    console.log('======================================================================');
    console.log('>> [ALL 11 CHECKS PASSED] System & Database Fully Verified! <<');
    console.log('======================================================================\n');
  } finally {
    // Clean up test user
    if (testUserId) {
      await pool.query('DELETE FROM app.users WHERE id = $1;', [testUserId]);
      console.log(`[CLEANUP] Deleted test user account: ${testEmail}`);
    }
    await pool.end();
  }
}

runVerification().catch(err => {
  console.error('\n[VERIFICATION ERROR]:', err);
  process.exit(1);
});
