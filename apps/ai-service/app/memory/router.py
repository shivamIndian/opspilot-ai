"""Internal authenticated FastAPI router for Agent Memory management, settings, search, and suggestions."""

import logging
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_async_session
from app.embeddings.router import verify_internal_service_token
from app.memory.schemas import (
    MemoryCreateRequest,
    MemoryUpdateRequest,
    MemoryResponse,
    MemoryListResponse,
    MemorySettingsResponse,
    MemorySettingsUpdateRequest,
    MemorySearchRequest,
    MemorySearchResponse,
    MemoryExtractionRequest,
    MemoryCandidateListResponse,
    MemoryBulkDeleteResponse,
    MemoryType,
    MemoryStatus,
)
from app.memory.services.memory_service import MemoryService
from app.memory.services.memory_retrieval_service import MemoryRetrievalService
from app.memory.extraction.extractor import ConversationMemoryExtractor
from app.memory.exceptions import (
    MemoryNotFoundError,
    MemoryAccessDeniedError,
    MemoryScreeningError,
    MemoryDuplicateError,
    MemoryConsentRequiredError,
)

logger = logging.getLogger("opspilot.memory.router")

router = APIRouter(prefix="/internal/v1/agent/memory", tags=["internal-agent-memory"])

_memory_service = MemoryService()


def get_memory_service() -> MemoryService:
    return _memory_service


@router.get(
    "/memories",
    response_model=MemoryListResponse,
    dependencies=[Depends(verify_internal_service_token)],
    summary="List Agent Memories",
)
async def list_memories_endpoint(
    organization_id: uuid.UUID = Query(...),
    user_id: uuid.UUID = Query(...),
    memory_type: Optional[MemoryType] = Query(None),
    status_filter: Optional[MemoryStatus] = Query(MemoryStatus.ACTIVE, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_async_session),
    service: MemoryService = Depends(get_memory_service),
) -> MemoryListResponse:
    return await service.list_memories(
        session=session,
        organization_id=organization_id,
        user_id=user_id,
        memory_type=memory_type,
        status=status_filter,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/memories",
    response_model=MemoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Create or Confirm Agent Memory",
)
async def create_memory_endpoint(
    request: MemoryCreateRequest,
    organization_id: uuid.UUID = Query(...),
    user_id: uuid.UUID = Query(...),
    session: AsyncSession = Depends(get_async_session),
    service: MemoryService = Depends(get_memory_service),
) -> MemoryResponse:
    try:
        mem = await service.create_memory(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            request=request,
        )
        await session.commit()
        return mem
    except MemoryConsentRequiredError as cre:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": cre.code, "message": cre.message},
        )
    except MemoryScreeningError as mse:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": mse.code, "message": mse.message, "violations": mse.violations},
        )
    except MemoryDuplicateError as mde:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": mde.code, "message": mde.message},
        )
    except Exception as e:
        await session.rollback()
        logger.error("Error creating memory: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "MEMORY_CREATION_FAILED", "message": str(e)},
        )


@router.get(
    "/memories/{memory_id}",
    response_model=MemoryResponse,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Get Agent Memory by ID",
)
async def get_memory_endpoint(
    memory_id: uuid.UUID,
    organization_id: uuid.UUID = Query(...),
    user_id: uuid.UUID = Query(...),
    session: AsyncSession = Depends(get_async_session),
    service: MemoryService = Depends(get_memory_service),
) -> MemoryResponse:
    try:
        return await service.get_memory(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            memory_id=memory_id,
        )
    except MemoryNotFoundError as mnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": mnf.code, "message": mnf.message},
        )


@router.patch(
    "/memories/{memory_id}",
    response_model=MemoryResponse,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Update Agent Memory",
)
async def update_memory_endpoint(
    memory_id: uuid.UUID,
    request: MemoryUpdateRequest,
    organization_id: uuid.UUID = Query(...),
    user_id: uuid.UUID = Query(...),
    session: AsyncSession = Depends(get_async_session),
    service: MemoryService = Depends(get_memory_service),
) -> MemoryResponse:
    try:
        mem = await service.update_memory(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            memory_id=memory_id,
            request=request,
        )
        await session.commit()
        return mem
    except MemoryNotFoundError as mnf:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": mnf.code, "message": mnf.message},
        )
    except MemoryScreeningError as mse:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": mse.code, "message": mse.message, "violations": mse.violations},
        )
    except Exception as e:
        await session.rollback()
        logger.error("Error updating memory: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "MEMORY_UPDATE_FAILED", "message": str(e)},
        )


@router.delete(
    "/memories/{memory_id}",
    dependencies=[Depends(verify_internal_service_token)],
    summary="Delete Agent Memory",
)
async def delete_memory_endpoint(
    memory_id: uuid.UUID,
    organization_id: uuid.UUID = Query(...),
    user_id: uuid.UUID = Query(...),
    session: AsyncSession = Depends(get_async_session),
    service: MemoryService = Depends(get_memory_service),
):
    try:
        await service.delete_memory(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            memory_id=memory_id,
        )
        await session.commit()
        return {"success": True, "id": str(memory_id)}
    except MemoryNotFoundError as mnf:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": mnf.code, "message": mnf.message},
        )


@router.delete(
    "/memories",
    response_model=MemoryBulkDeleteResponse,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Bulk Purge User Memories",
)
async def bulk_purge_endpoint(
    organization_id: uuid.UUID = Query(...),
    user_id: uuid.UUID = Query(...),
    session: AsyncSession = Depends(get_async_session),
    service: MemoryService = Depends(get_memory_service),
) -> MemoryBulkDeleteResponse:
    purged_count = await service.bulk_purge(
        session=session,
        organization_id=organization_id,
        user_id=user_id,
    )
    await session.commit()
    return MemoryBulkDeleteResponse(
        deleted_count=purged_count,
        user_id=user_id,
        organization_id=organization_id,
    )


@router.get(
    "/settings",
    response_model=MemorySettingsResponse,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Get Memory Settings & Consent",
)
async def get_settings_endpoint(
    organization_id: uuid.UUID = Query(...),
    user_id: uuid.UUID = Query(...),
    session: AsyncSession = Depends(get_async_session),
    service: MemoryService = Depends(get_memory_service),
) -> MemorySettingsResponse:
    return await service.get_settings(
        session=session,
        organization_id=organization_id,
        user_id=user_id,
    )


@router.patch(
    "/settings",
    response_model=MemorySettingsResponse,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Update Memory Settings & Consent",
)
async def update_settings_endpoint(
    request: MemorySettingsUpdateRequest,
    organization_id: uuid.UUID = Query(...),
    user_id: uuid.UUID = Query(...),
    session: AsyncSession = Depends(get_async_session),
    service: MemoryService = Depends(get_memory_service),
) -> MemorySettingsResponse:
    updated = await service.update_settings(
        session=session,
        organization_id=organization_id,
        user_id=user_id,
        request=request,
    )
    await session.commit()
    return updated


@router.post(
    "/search",
    response_model=MemorySearchResponse,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Semantic Search Agent Memories",
)
async def search_memories_endpoint(
    request: MemorySearchRequest,
    organization_id: uuid.UUID = Query(...),
    user_id: uuid.UUID = Query(...),
    session: AsyncSession = Depends(get_async_session),
) -> MemorySearchResponse:
    try:
        results = await MemoryRetrievalService.retrieve_relevant_memories(
            session=session,
            organization_id=organization_id,
            user_id=user_id,
            query=request.query,
            memory_type=request.memory_type,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold,
            require_consent=True,
        )
        return MemorySearchResponse(
            results=results,
            total=len(results),
            query=request.query,
        )
    except MemoryConsentRequiredError as cre:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": cre.code, "message": cre.message},
        )


@router.post(
    "/suggestions",
    response_model=MemoryCandidateListResponse,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Extract Candidate Memory Suggestions",
)
async def extract_suggestions_endpoint(
    request: MemoryExtractionRequest,
    organization_id: uuid.UUID = Query(...),
    user_id: uuid.UUID = Query(...),
    session: AsyncSession = Depends(get_async_session),
) -> MemoryCandidateListResponse:
    # Verify consent
    settings_obj = await MemorySettingsRepository.get_or_create(session, organization_id, user_id)
    if not settings_obj.memory_enabled or not settings_obj.memory_extraction_enabled:
        return MemoryCandidateListResponse(
            candidates=[],
            conversation_id=request.conversation_id,
            detected_count=0,
        )

    extractor = ConversationMemoryExtractor()
    candidates = await extractor.extract_candidates(
        messages=request.messages,
        workflow_context=request.workflow_context,
    )
    return MemoryCandidateListResponse(
        candidates=candidates,
        conversation_id=request.conversation_id,
        detected_count=len(candidates),
    )
