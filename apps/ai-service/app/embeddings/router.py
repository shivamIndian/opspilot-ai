"""Internal authenticated router for embedding generation."""

import secrets
from typing import Annotated
from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.settings import settings
from app.database.session import get_async_session
from app.embeddings.schemas import GenerateEmbeddingsRequest, GenerateEmbeddingsResponse
from app.embeddings.services.embedding_service import embedding_service, EmbeddingService
from app.embeddings.exceptions import EmbeddingError

router = APIRouter(prefix="/internal/v1/embeddings", tags=["internal-embeddings"])


def verify_internal_service_token(
    authorization: Annotated[str | None, Header()] = None,
    x_internal_service_token: Annotated[str | None, Header(alias="x-internal-service-token")] = None,
) -> None:
    """Validates service-to-service internal bearer or service token using constant-time comparison."""
    provided_token = None

    if x_internal_service_token:
        provided_token = x_internal_service_token
    elif authorization:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            provided_token = parts[1]
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_TOKEN_FORMAT", "message": "Bearer token format required"},
            )

    if not provided_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "MISSING_SERVICE_TOKEN", "message": "Authorization or x-internal-service-token header is required"},
        )

    expected_token = settings.AI_SERVICE_INTERNAL_TOKEN

    if not secrets.compare_digest(provided_token.encode("utf-8"), expected_token.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "UNAUTHORIZED_SERVICE", "message": "Invalid service authentication token"},
        )


@router.post(
    "/generate",
    response_model=GenerateEmbeddingsResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
)
async def generate_embeddings_endpoint(
    request: GenerateEmbeddingsRequest,
    session: AsyncSession = Depends(get_async_session),
    service: EmbeddingService = Depends(lambda: embedding_service),
) -> GenerateEmbeddingsResponse:
    """Internal service endpoint called by Node.js embedding workers."""
    try:
        response = await service.generate_document_embeddings(
            session=session,
            request=request,
        )
        return response

    except EmbeddingError as e:
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
            },
        )
