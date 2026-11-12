"""Repository for AgentMemorySetting entity."""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.memory.models import AgentMemorySetting


class MemorySettingsRepository:
    """Manages user consent and memory retention configurations."""

    @staticmethod
    async def get_or_create(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> AgentMemorySetting:
        """Fetch existing user settings or create default (disabled) settings."""
        query = select(AgentMemorySetting).where(
            and_(
                AgentMemorySetting.organization_id == organization_id,
                AgentMemorySetting.user_id == user_id,
            )
        )
        existing = (await session.execute(query)).scalar_one_or_none()

        if existing:
            return existing

        default_settings = AgentMemorySetting(
            organization_id=organization_id,
            user_id=user_id,
            memory_enabled=False,
            memory_extraction_enabled=False,
            episodic_memory_enabled=False,
            retention_days=None,
            consent_version="v1.0",
        )
        session.add(default_settings)
        await session.flush()
        return default_settings

    @staticmethod
    async def update(
        session: AsyncSession,
        settings: AgentMemorySetting,
        update_data: Dict[str, Any],
    ) -> AgentMemorySetting:
        """Update consent and retention settings."""
        for key, val in update_data.items():
            if hasattr(settings, key) and val is not None:
                setattr(settings, key, val)
        settings.updated_at = datetime.now(timezone.utc)
        await session.flush()
        return settings
