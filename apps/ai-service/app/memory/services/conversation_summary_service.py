"""Service for generating and persisting episodic conversation summaries."""

import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.llm.provider_factory import get_llm_provider
from app.memory.models import AgentConversationSummary
from app.memory.schemas import ConversationSummaryResponse
from app.memory.repositories.conversation_summary_repository import ConversationSummaryRepository
from app.memory.repositories.memory_settings_repository import MemorySettingsRepository
from app.memory.services.memory_screening_service import get_memory_screening_service

logger = logging.getLogger("opspilot.memory.summary")


class ConversationSummaryService:
    """Creates compact episodic summaries of multi-turn workflow interactions."""

    def __init__(self):
        self.screening_service = get_memory_screening_service()

    async def summarize_and_save(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        conversation_id: str,
        messages: List[Dict[str, Any]],
    ) -> Optional[ConversationSummaryResponse]:
        """Summarize conversation if episodic memory consent is enabled."""
        settings = await MemorySettingsRepository.get_or_create(session, organization_id, user_id)
        if not settings.memory_enabled or not settings.episodic_memory_enabled:
            logger.debug("Episodic summary skipped: episodic memory consent is disabled.")
            return None

        if len(messages) < 2:
            return None

        # Format transcript
        lines = []
        for msg in messages:
            role = msg.get("role", "unknown").upper()
            content = msg.get("content", "")
            if isinstance(content, str):
                lines.append(f"{role}: {content}")
        transcript = "\n".join(lines)

        prompt = (
            "Summarize the following technical workflow interaction into 2-3 concise factual sentences.\n"
            "Focus on the user's objective, key decisions, and technical choices made.\n"
            "DO NOT include credentials, passwords, or personal sensitive details.\n\n"
            f"Transcript:\n{transcript}\n\nSummary:"
        )

        try:
            llm_provider = get_llm_provider()
            messages_payload = [
                {
                    "role": "system",
                    "content": "You are an enterprise AI workflow assistant that summarizes interactions concisely.",
                },
                {"role": "user", "content": prompt},
            ]
            summary_text, _ = await llm_provider.generate(
                messages=messages_payload,
                temperature=0.1,
                max_tokens=250,
            )
            summary_text = summary_text.strip()

            # Screening check
            is_clean, violations = self.screening_service.screen_text(summary_text)
            if not is_clean:
                logger.warning("Generated episodic summary contained prohibited content: %s", violations)
                return None

            record = await ConversationSummaryRepository.upsert(
                session=session,
                organization_id=organization_id,
                user_id=user_id,
                conversation_id=conversation_id,
                summary=summary_text,
                message_count=len(messages),
            )
            return ConversationSummaryResponse.model_validate(record)
        except Exception as e:
            logger.error("Failed to generate episodic conversation summary: %s", e)
            return None

    async def get_summary(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        conversation_id: str,
    ) -> Optional[ConversationSummaryResponse]:
        """Fetch existing conversation summary."""
        record = await ConversationSummaryRepository.get_by_conversation_id(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            conversation_id=conversation_id,
        )
        if record:
            return ConversationSummaryResponse.model_validate(record)
        return None
