"""Core domain service for managing agent memory lifecycles."""

import uuid
import logging
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.embeddings.provider_factory import get_embedding_provider
from app.memory.models import AgentMemory
from app.memory.schemas import (
    MemoryCreateRequest,
    MemoryUpdateRequest,
    MemoryResponse,
    MemoryListResponse,
    MemorySettingsResponse,
    MemorySettingsUpdateRequest,
    MemoryType,
    MemoryStatus,
)
from app.memory.repositories.memory_repository import MemoryRepository, calculate_content_hash
from app.memory.repositories.memory_embedding_repository import MemoryEmbeddingRepository
from app.memory.repositories.memory_settings_repository import MemorySettingsRepository
from app.memory.services.memory_screening_service import get_memory_screening_service
from app.memory.services.memory_consolidation_service import MemoryConsolidationService
from app.memory.exceptions import (
    MemoryNotFoundError,
    MemoryDuplicateError,
    MemoryConsentRequiredError,
)

logger = logging.getLogger("opspilot.memory.service")


class MemoryService:
    """Coordinates memory creation, screening, embedding generation, mutation, and audit events."""

    def __init__(self):
        self.screening_service = get_memory_screening_service()

    async def create_memory(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        request: MemoryCreateRequest,
    ) -> MemoryResponse:
        """Create a new long-term agent memory with screening, deduplication, and vector indexing."""
        # 1. Verify user consent
        settings = await MemorySettingsRepository.get_or_create(session, organization_id, user_id)
        if not settings.memory_enabled:
            raise MemoryConsentRequiredError("Cannot save memory: user has memory disabled.")

        # 2. Security screening (block credentials, PII, injections)
        self.screening_service.assert_clean(request.title, context_label="title")
        self.screening_service.assert_clean(request.content, context_label="content")

        # 3. Deduplication check
        c_hash = calculate_content_hash(request.content)
        is_dup, existing = await MemoryConsolidationService.check_exact_duplicate(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            content=request.content,
        )
        if is_dup and existing:
            raise MemoryDuplicateError(f"Identical active memory already exists (ID: {existing.id}).")

        # 4. Create memory entity
        memory = AgentMemory(
            organization_id=organization_id,
            user_id=user_id,
            memory_type=request.memory_type.value,
            category=request.category,
            title=request.title,
            content=request.content,
            content_hash=c_hash,
            importance_score=request.importance_score,
            status=MemoryStatus.ACTIVE.value,
            source_type=request.source_type,
            source_reference=request.source_reference,
            consent_version=request.consent_version,
            expires_at=request.expires_at,
        )
        created_memory = await MemoryRepository.create(session, memory)

        # 5. Generate and store vector embedding
        embedding_provider = get_embedding_provider()
        text_to_embed = f"{request.title}\n{request.content}"
        vector = await embedding_provider.embed_query(text_to_embed)

        await MemoryEmbeddingRepository.upsert_embedding(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            memory_id=created_memory.id,
            provider=embedding_provider.provider_name,
            model=embedding_provider.model,
            dimensions=embedding_provider.dimensions,
            embedding_space=embedding_provider.embedding_space,
            embedding=vector,
        )

        # 6. Audit event
        await MemoryRepository.record_event(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            event_type="MEMORY_CREATED",
            memory_id=created_memory.id,
            metadata={
                "memory_type": created_memory.memory_type,
                "category": created_memory.category,
                "importance_score": created_memory.importance_score,
                "source_type": created_memory.source_type,
            },
        )

        return MemoryResponse.model_validate(created_memory)

    async def get_memory(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        memory_id: uuid.UUID,
    ) -> MemoryResponse:
        """Fetch a single memory item ensuring strict tenant and user isolation."""
        memory = await MemoryRepository.get_by_id(session, organization_id, user_id, memory_id)
        if not memory:
            raise MemoryNotFoundError(f"Memory {memory_id} not found.")
        return MemoryResponse.model_validate(memory)

    async def list_memories(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        memory_type: Optional[MemoryType] = None,
        status: Optional[MemoryStatus] = MemoryStatus.ACTIVE,
        limit: int = 50,
        offset: int = 0,
    ) -> MemoryListResponse:
        """List paginated memories for user."""
        type_filter = memory_type.value if memory_type else None
        status_filter = status.value if status else None
        items, total = await MemoryRepository.list_memories(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            memory_type=type_filter,
            status=status_filter,
            limit=limit,
            offset=offset,
        )
        return MemoryListResponse(
            items=[MemoryResponse.model_validate(m) for m in items],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def update_memory(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        memory_id: uuid.UUID,
        request: MemoryUpdateRequest,
    ) -> MemoryResponse:
        """Update an existing memory."""
        memory = await MemoryRepository.get_by_id(session, organization_id, user_id, memory_id)
        if not memory:
            raise MemoryNotFoundError(f"Memory {memory_id} not found.")

        update_dict = {}
        content_changed = False

        if request.title is not None and request.title != memory.title:
            self.screening_service.assert_clean(request.title, context_label="title")
            update_dict["title"] = request.title
            content_changed = True

        if request.content is not None and request.content != memory.content:
            self.screening_service.assert_clean(request.content, context_label="content")
            update_dict["content"] = request.content
            update_dict["content_hash"] = calculate_content_hash(request.content)
            content_changed = True

        if request.category is not None:
            update_dict["category"] = request.category
        if request.importance_score is not None:
            update_dict["importance_score"] = request.importance_score
        if request.status is not None:
            update_dict["status"] = request.status.value
        if request.expires_at is not None:
            update_dict["expires_at"] = request.expires_at

        updated_memory = await MemoryRepository.update(session, memory, update_dict)

        # Refresh embedding if content or title changed
        if content_changed:
            embedding_provider = get_embedding_provider()
            text_to_embed = f"{updated_memory.title}\n{updated_memory.content}"
            vector = await embedding_provider.embed_query(text_to_embed)
            await MemoryEmbeddingRepository.upsert_embedding(
                session=session,
                organization_id=organization_id,
                user_id=user_id,
                memory_id=updated_memory.id,
                provider=embedding_provider.provider_name,
                model=embedding_provider.model,
                dimensions=embedding_provider.dimensions,
                embedding_space=embedding_provider.embedding_space,
                embedding=vector,
            )

        # Audit event
        await MemoryRepository.record_event(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            event_type="MEMORY_UPDATED",
            memory_id=updated_memory.id,
            metadata={"updated_fields": list(update_dict.keys())},
        )

        return MemoryResponse.model_validate(updated_memory)

    async def delete_memory(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        memory_id: uuid.UUID,
    ) -> bool:
        """Soft-delete memory and clean up its embedding."""
        deleted = await MemoryRepository.soft_delete(session, organization_id, user_id, memory_id)
        if not deleted:
            raise MemoryNotFoundError(f"Memory {memory_id} not found.")

        await MemoryEmbeddingRepository.delete_by_memory_id(session, memory_id)

        await MemoryRepository.record_event(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            event_type="MEMORY_DELETED",
            memory_id=memory_id,
        )
        return True

    async def bulk_purge(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> int:
        """Purge all memories for a user."""
        count = await MemoryRepository.bulk_purge(session, organization_id, user_id)
        await MemoryRepository.record_event(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            event_type="MEMORY_PURGED_ALL",
            metadata={"purged_count": count},
        )
        return count

    async def get_settings(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> MemorySettingsResponse:
        """Get user memory settings and consent status."""
        settings = await MemorySettingsRepository.get_or_create(session, organization_id, user_id)
        return MemorySettingsResponse.model_validate(settings)

    async def update_settings(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        request: MemorySettingsUpdateRequest,
    ) -> MemorySettingsResponse:
        """Update user memory settings."""
        settings = await MemorySettingsRepository.get_or_create(session, organization_id, user_id)
        update_dict = request.model_dump(exclude_unset=True)
        updated = await MemorySettingsRepository.update(session, settings, update_dict)

        await MemoryRepository.record_event(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            event_type="MEMORY_SETTINGS_UPDATED",
            metadata=update_dict,
        )
        return MemorySettingsResponse.model_validate(updated)
