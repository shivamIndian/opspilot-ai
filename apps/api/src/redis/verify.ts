import { redis, checkRedisHealth, getSanitizedRedisUrl } from './index.js';
import { config } from '../config/env.js';

async function main() {
  console.log('=== Verifying Node.js Redis Connection ===');
  console.log(`Connecting to: ${getSanitizedRedisUrl(config.REDIS_URL)}`);

  const health = await checkRedisHealth();
  if (health.status !== 'up') {
    console.error('❌ Redis health check failed:', health.error);
    process.exit(1);
  }

  console.log(`✅ Connection successful! Latency: ${health.latencyMs}ms`);

  // Write and Read a test key
  const testKey = 'opspilot:test:probe';
  const testVal = `verified-${Date.now()}`;
  await redis.set(testKey, testVal, 'EX', 10);
  const readVal = await redis.get(testKey);

  if (readVal === testVal) {
    console.log(`✅ Redis SET/GET test passed for key: ${testKey}`);
  } else {
    console.error(`❌ Redis value mismatch. Expected ${testVal}, got ${readVal}`);
    process.exit(1);
  }

  await redis.del(testKey);
  console.log('✅ Redis test probe cleaned up.');

  await redis.quit();
  console.log('=== Node.js Redis Verification Completed Successfully ===');
}

main().catch(err => {
  console.error('❌ Redis verification failed:', err.message);
  process.exit(1);
});
