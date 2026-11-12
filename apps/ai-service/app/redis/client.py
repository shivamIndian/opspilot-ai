import urllib.parse
from typing import Optional
import redis.asyncio as aioredis
from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger("opspilot_ai.redis")

# Singleton Redis client instance
redis_client: Optional[aioredis.Redis] = None


def get_sanitized_redis_url(url: str) -> str:
    """Mask password credentials in Redis URL for safe logging."""
    try:
        parsed = urllib.parse.urlsplit(url)
        if parsed.password:
            netloc = f":***REDACTED***@{parsed.hostname}:{parsed.port}"
            return urllib.parse.urlunsplit(
                (parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment)
            )
        return url
    except Exception:
        return "redis://***REDACTED***"


def get_redis_client() -> aioredis.Redis:
    """Returns or initializes the singleton asynchronous Redis client."""
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            health_check_interval=30,
        )
    return redis_client


async def close_redis() -> None:
    """Gracefully close active connection pool in the Redis client."""
    global redis_client
    if redis_client is not None:
        logger.info("Closing asynchronous Redis connection pool...")
        await redis_client.aclose()
        redis_client = None
        logger.info("Asynchronous Redis connection closed cleanly.")
