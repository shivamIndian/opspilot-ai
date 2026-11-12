import urllib.parse
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy.orm import DeclarativeBase
from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger("opspilot_ai.database")


class Base(DeclarativeBase):
    """Base declarative class for SQLAlchemy models in ai-service."""
    pass


def get_sanitized_database_url(url: str) -> str:
    """Mask credentials in database URL for safe logging."""
    try:
        parsed = urllib.parse.urlsplit(url)
        if parsed.password:
            netloc = f"{parsed.username}:***REDACTED***@{parsed.hostname}:{parsed.port}"
            return urllib.parse.urlunsplit(
                (parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment)
            )
        return url
    except Exception:
        return "postgresql+asyncpg://***REDACTED***"


# Create asynchronous SQLAlchemy engine configured for 'ai' schema operations
engine: AsyncEngine = create_async_engine(
    settings.AI_DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_pre_ping=True,
    echo=False,
    connect_args={
        "server_settings": {
            "search_path": "ai, public",
        }
    },
)


async def dispose_engine() -> None:
    """Gracefully close all active connection pools in the async engine."""
    logger.info("Disposing SQLAlchemy async database engine...")
    await engine.dispose()
    logger.info("SQLAlchemy async engine disposed cleanly.")
