import asyncio
from sqlalchemy import text
from app.database.connection import engine, get_sanitized_database_url
from app.database.health import check_database_health
from app.redis.client import get_redis_client, close_redis, get_sanitized_redis_url
from app.redis.health import check_redis_health
from app.config.settings import settings


async def main() -> None:
    print("=== Verifying Python AI Service PostgreSQL & Redis Integration ===")
    print(f"Target Database: {get_sanitized_database_url(settings.AI_DATABASE_URL)}")
    print(f"Target Redis:    {get_sanitized_redis_url(settings.REDIS_URL)}")

    # 1. Database Health Probe
    db_health = await check_database_health()
    if db_health["status"] != "up":
        print(f"❌ PostgreSQL health check failed: {db_health.get('error')}")
    else:
        print(f"✅ PostgreSQL connection successful! Latency: {db_health['latency_ms']}ms")

        # Extended DB check
        async with engine.connect() as conn:
            # Check user and search path
            res = await conn.execute(text("SELECT current_user, current_schema();"))
            user, schema = res.one()
            print(f"✅ Current Role: {user}, Current Schema: {schema}")

            # Check pgvector extension
            vec_res = await conn.execute(
                text("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
            )
            vec_row = vec_res.fetchone()
            if vec_row:
                print(f"✅ pgvector Extension verified: v{vec_row[1]}")
            else:
                print("⚠️ pgvector extension is NOT enabled.")

            # Test write access in 'ai' schema
            await conn.execute(
                text("CREATE TABLE IF NOT EXISTS ai._verify_ai_probe (id serial primary key, val text);")
            )
            await conn.execute(
                text("INSERT INTO ai._verify_ai_probe (val) VALUES ('opspilot-ai-verified');")
            )
            await conn.commit()
            count_res = await conn.execute(text("SELECT count(*) FROM ai._verify_ai_probe;"))
            print(f"✅ Schema 'ai' write probe passed (records: {count_res.scalar()})")
            await conn.execute(text("DROP TABLE IF EXISTS ai._verify_ai_probe;"))
            await conn.commit()
            print("✅ Schema 'ai' test table cleaned up.")

    # 2. Redis Health Probe
    redis_health = await check_redis_health()
    if redis_health["status"] != "up":
        print(f"❌ Redis health check failed: {redis_health.get('error')}")
    else:
        print(f"✅ Redis connection successful! Latency: {redis_health['latency_ms']}ms")
        client = get_redis_client()
        test_key = "opspilot:ai:probe"
        test_val = "verified-async"
        await client.set(test_key, test_val, ex=10)
        read_val = await client.get(test_key)
        if read_val == test_val:
            print(f"✅ Redis Async SET/GET test passed for key: {test_key}")
        await client.delete(test_key)
        print("✅ Redis test key cleaned up.")

    await engine.dispose()
    await close_redis()
    print("=== Python AI Service Infrastructure Verification Completed ===")


if __name__ == "__main__":
    asyncio.run(main())
