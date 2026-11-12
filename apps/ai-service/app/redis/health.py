import time
from typing import Any
from app.redis.client import get_redis_client
from app.core.logging import get_logger

logger = get_logger("opspilot_ai.redis.health")


async def check_redis_health() -> dict[str, Any]:
    """Probes the Redis cluster using PING command with latency measurement."""
    start_time = time.perf_counter()
    try:
        client = get_redis_client()
        pong = await client.ping()
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        if pong:
            return {
                "status": "up",
                "latency_ms": latency_ms,
            }
        return {
            "status": "down",
            "latency_ms": latency_ms,
            "error": "Redis returned unexpected response",
        }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.warning(f"Redis health check failed ({latency_ms}ms): {exc}")
        return {
            "status": "down",
            "latency_ms": latency_ms,
            "error": "Redis connection failed",
        }
