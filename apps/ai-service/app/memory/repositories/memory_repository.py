"""Repository for AgentMemory and AgentMemoryEvent entities."""

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.memory.models import AgentMemory, AgentMemoryEvent
from app.memory.schemas import MemoryType, MemoryStatus


def calculate_content_hash(text_content: str) -> str:
    """Calculate normalized SHA-256 hash of text content for deduplication."""
    normalized = " ".join(text_content.lower().strip().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class MemoryRepository:
    """Handles database persistence for agent memory records and audit events."""

    @staticmethod
    async def get_by_id(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        memory_id: uuid.UUID,
        include_deleted: bool = False,
    ) -> Optional[AgentMemory]:
        """Fetch memory record strictly scoped to organization and user."""
        conditions = [
            AgentMemory.id == memory_id,
            AgentMemory.organization_id == organization_id,
            AgentMemory.user_id == user_id,
        ]
        if not include_deleted:
            conditions.append(AgentMemory.deleted_at.is_(None))

        query = select(AgentMemory).where(and_(*conditions))
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def find_by_content_hash(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        content_hash: str,
    ) -> Optional[AgentMemory]:
        """Find active memory with matching content hash for the user."""
        query = select(AgentMemory).where(
            and_(
                AgentMemory.organization_id == organization_id,
                AgentMemory.user_id == user_id,
                AgentMemory.content_hash == content_hash,
                AgentMemory.status == MemoryStatus.ACTIVE.value,
                AgentMemory.deleted_at.is_(None),
            )
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_memories(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        memory_type: Optional[str] = None,
        status: Optional[str] = MemoryStatus.ACTIVE.value,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AgentMemory], int]:
        """List memories with pagination and filtering."""
        conditions = [
            AgentMemory.organization_id == organization_id,
            AgentMemory.user_id == user_id,
        ]

        if status:
            conditions.append(AgentMemory.status == status)
        if status != MemoryStatus.DELETED.value:
            conditions.append(AgentMemory.deleted_at.is_(None))

        if memory_type:
            conditions.append(AgentMemory.memory_type == memory_type)

        # Count query
        count_stmt = select(func.count(AgentMemory.id)).where(and_(*conditions))
        total = (await session.execute(count_stmt)).scalar() or 0

        # Data query
        query = (
            select(AgentMemory)
            .where(and_(*conditions))
            .order_by(AgentMemory.importance_score.desc(), AgentMemory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        rows = (await session.execute(query)).scalars().all()
        return list(rows), total

    @staticmethod
    async def create(session: AsyncSession, memory: AgentMemory) -> AgentMemory:
        """Create a new memory record."""
        session.add(memory)
        await session.flush()
        return memory

    @staticmethod
    async def update(
        session: AsyncSession,
        memory: AgentMemory,
        update_data: Dict[str, Any],
    ) -> AgentMemory:
        """Update existing memory record."""
        for field, value in update_data.items():
            if hasattr(memory, field) and value is not None:
                setattr(memory, field, value)
        memory.updated_at = datetime.now(timezone.utc)
        await session.flush()
        return memory

    @staticmethod
    async def soft_delete(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        memory_id: uuid.UUID,
    ) -> bool:
        """Soft delete a memory record."""
        stmt = (
            update(AgentMemory)
            .where(
                and_(
                    AgentMemory.id == memory_id,
                    AgentMemory.organization_id == organization_id,
                    AgentMemory.user_id == user_id,
                    AgentMemory.deleted_at.is_(None),
                )
            )
            .values(
                status=MemoryStatus.DELETED.value,
                deleted_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
        )
        result = await session.execute(stmt)
        return result.rowcount > 0

    @staticmethod
    async def bulk_purge(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> int:
        """Permanently purge or soft-delete all memories for a user."""
        stmt = (
            update(AgentMemory)
            .where(
                and_(
                    AgentMemory.organization_id == organization_id,
                    AgentMemory.user_id == user_id,
                    AgentMemory.deleted_at.is_(None),
                )
            )
            .values(
                status=MemoryStatus.DELETED.value,
                deleted_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
        )
        result = await session.execute(stmt)
        return result.rowcount

    @staticmethod
    async def record_event(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        event_type: str,
        memory_id: Optional[uuid.UUID] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AgentMemoryEvent:
        """Record an audit trail event for memory actions."""
        event = AgentMemoryEvent(
            organization_id=organization_id,
            user_id=user_id,
            memory_id=memory_id,
            event_type=event_type,
            metadata_=metadata or {},
        )
        session.add(event)
        await session.flush()
        return event
