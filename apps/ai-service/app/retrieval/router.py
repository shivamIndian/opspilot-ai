"""Internal authenticated router for RAG retrieval operations."""

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_async_session
from app.embeddings.router import verify_internal_service_token
from app.retrieval.schemas import InternalSearchRequest, InternalSearchResponse
from app.retrieval.services.retrieval_service import retrieval_service, RetrievalService
from app.retrieval.exceptions import RetrievalError

router = APIRouter(prefix="/internal/v1/retrieval", tags=["internal-retrieval"])


@router.post(
    "/search",
    response_model=InternalSearchResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
)
async def search_endpoint(
    request: InternalSearchRequest,
    session: AsyncSession = Depends(get_async_session),
    service: RetrievalService = Depends(lambda: retrieval_service),
) -> InternalSearchResponse:
    """Internal service-to-service search endpoint invoked by Node.js API."""
    try:
        response = await service.search(
            session=session,
            request=request,
        )
        return response

    except RetrievalError as e:
        status_code = (
            status.HTTP_500_INTERNAL_SERVER_ERROR
            if e.is_retryable
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "error_code": e.error_code,
                "message": e.message,
                "is_retryable": e.is_retryable,
                "details": e.details,
            },
        )
