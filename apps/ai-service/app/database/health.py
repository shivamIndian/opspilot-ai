import time
from typing import Any
from sqlalchemy import text
from app.database.connection import engine
from app.core.logging import get_logger

logger = get_logger("opspilot_ai.database.health")


async def check_database_health() -> dict[str, Any]:
    """Probes the PostgreSQL cluster for connectivity and latency."""
    start_time = time.perf_counter()
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1;"))
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "status": "up",
                "latency_ms": latency_ms,
            }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.warning(f"Database health check failed ({latency_ms}ms): {exc}")
        return {
            "status": "down",
            "latency_ms": latency_ms,
            "error": "Database connection failed",
        }
