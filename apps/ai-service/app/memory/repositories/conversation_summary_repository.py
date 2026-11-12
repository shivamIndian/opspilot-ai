"""Repository for AgentConversationSummary entity."""

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.memory.models import AgentConversationSummary


def calculate_summary_hash(text_content: str) -> str:
    """SHA-256 hash of episodic summary."""
    return hashlib.sha256(text_content.strip().encode("utf-8")).hexdigest()


class ConversationSummaryRepository:
    """Persists episodic workflow and conversation summaries."""

    @staticmethod
    async def get_by_conversation_id(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        conversation_id: str,
    ) -> Optional[AgentConversationSummary]:
        """Fetch existing conversation summary."""
        query = select(AgentConversationSummary).where(
            and_(
                AgentConversationSummary.organization_id == organization_id,
                AgentConversationSummary.user_id == user_id,
                AgentConversationSummary.conversation_id == conversation_id,
            )
        )
        return (await session.execute(query)).scalar_one_or_none()

    @staticmethod
    async def upsert(
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        conversation_id: str,
        summary: str,
        message_count: int = 0,
        summary_version: str = "v1.0",
    ) -> AgentConversationSummary:
        """Create or update conversation episodic summary."""
        existing = await ConversationSummaryRepository.get_by_conversation_id(
            session, organization_id, user_id, conversation_id
        )
        s_hash = calculate_summary_hash(summary)

        if existing:
            existing.summary = summary
            existing.summary_hash = s_hash
            existing.message_count = message_count
            existing.summary_version = summary_version
            existing.updated_at = datetime.now(timezone.utc)
            await session.flush()
            return existing

        new_sum = AgentConversationSummary(
            organization_id=organization_id,
            user_id=user_id,
            conversation_id=conversation_id,
            summary=summary,
            summary_hash=s_hash,
            message_count=message_count,
            summary_version=summary_version,
        )
        session.add(new_sum)
        await session.flush()
        return new_sum
