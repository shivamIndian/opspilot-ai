"""Checkpointer lifecycle management for LangGraph state persistence."""

import sys
import asyncio
import logging
from typing import Optional, Any
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver

from app.config.settings import settings

logger = logging.getLogger(__name__)

# On Windows, psycopg 3 async connection requires SelectorEventLoop instead of default ProactorEventLoop
if sys.platform == "win32":
    try:
        from asyncio import WindowsSelectorEventLoopPolicy
        if not isinstance(asyncio.get_event_loop_policy(), WindowsSelectorEventLoopPolicy):
            asyncio.set_event_loop_policy(WindowsSelectorEventLoopPolicy())
    except Exception as _e:
        logger.debug(f"[Checkpointer] Event loop policy setting notice: {_e}")

_checkpointer_instance: Optional[BaseCheckpointSaver] = None
_saver_cm: Optional[Any] = None


def get_checkpointer_conn_string() -> str:
    """Derives standard PostgreSQL connection string for psycopg from SQLAlchemy asyncpg URL."""
    base_url = settings.AI_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    sep = "&" if "?" in base_url else "?"
    if "search_path" not in base_url:
        return f"{base_url}{sep}options=-csearch_path%3Dai,public"
    return base_url


async def init_workflow_checkpointer() -> BaseCheckpointSaver:
    """Initializes persistent AsyncPostgresSaver or fallback MemorySaver for testing."""
    global _checkpointer_instance, _saver_cm

    if _checkpointer_instance is not None:
        return _checkpointer_instance

    # For testing or offline simulation, use MemorySaver
    if settings.APP_ENV == "test":
        logger.info("[Checkpointer] Initialized in-memory checkpointer for test environment.")
        _checkpointer_instance = MemorySaver()
        return _checkpointer_instance

    try:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        conn_str = get_checkpointer_conn_string()
        _saver_cm = AsyncPostgresSaver.from_conn_string(conn_str)
        saver = await _saver_cm.__aenter__()
        await saver.setup()
        _checkpointer_instance = saver
        logger.info("[Checkpointer] Connected AsyncPostgresSaver with 'ai' schema tables.")
        return _checkpointer_instance

    except Exception as e:
        logger.warning(
            f"[Checkpointer] Could not initialize PostgreSQL checkpointer ({e}). Falling back to MemorySaver."
        )
        _checkpointer_instance = MemorySaver()
        return _checkpointer_instance


def get_workflow_checkpointer() -> Optional[BaseCheckpointSaver]:
    """Returns the active checkpointer singleton instance."""
    global _checkpointer_instance
    if _checkpointer_instance is None:
        # Default to memory saver if not yet initialized by lifespan
        _checkpointer_instance = MemorySaver()
    return _checkpointer_instance


def set_workflow_checkpointer(saver: BaseCheckpointSaver) -> None:
    """Overrides checkpointer instance (used by test suites)."""
    global _checkpointer_instance
    _checkpointer_instance = saver


async def close_workflow_checkpointer() -> None:
    """Safely closes checkpointer connection pools during application shutdown."""
    global _checkpointer_instance, _saver_cm
    if _saver_cm is not None:
        try:
            await _saver_cm.__aexit__(None, None, None)
            logger.info("[Checkpointer] Disposed PostgreSQL checkpointer connection.")
        except Exception as e:
            logger.error(f"[Checkpointer] Error closing checkpointer: {e}")
        finally:
            _saver_cm = None
    _checkpointer_instance = None
