"""Internal authenticated router for LLM generation operations."""

import logging
from fastapi import APIRouter, Depends, status, HTTPException
from app.embeddings.router import verify_internal_service_token
from app.llm.schemas import (
    InternalLLMGenerateRequest,
    InternalLLMGenerateResponse,
    InternalLLMGenerateData,
)
from app.llm.services.response_generation_service import ResponseGenerationService
from app.llm.exceptions import (
    LLMError,
    LLMAuthenticationFailedError,
    LLMRateLimitedError,
    LLMQuotaExceededError,
    LLMTimeoutError,
    LLMProviderUnavailableError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/v1/llm", tags=["internal-llm"])
generation_service = ResponseGenerationService()


@router.post(
    "/generate",
    response_model=InternalLLMGenerateResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
)
async def generate_endpoint(
    request: InternalLLMGenerateRequest,
    service: ResponseGenerationService = Depends(lambda: generation_service),
) -> InternalLLMGenerateResponse:
    """Internal service-to-service LLM generation endpoint called exclusively by Node.js API."""
    try:
        data: InternalLLMGenerateData = await service.generate_response(request)
        return InternalLLMGenerateResponse(success=True, data=data)

    except LLMAuthenticationFailedError as e:
        logger.error(f"LLM authentication failed: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error_code": e.error_code,
                "message": e.message,
                "is_retryable": False,
                "details": e.details,
            },
        )
    except (LLMRateLimitedError, LLMQuotaExceededError) as e:
        logger.warning(f"LLM rate limited or quota exceeded: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "success": False,
                "error_code": e.error_code,
                "message": e.message,
                "is_retryable": e.is_retryable,
                "details": e.details,
            },
        )
    except LLMTimeoutError as e:
        logger.warning(f"LLM generation timed out: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={
                "success": False,
                "error_code": e.error_code,
                "message": e.message,
                "is_retryable": True,
                "details": e.details,
            },
        )
    except LLMProviderUnavailableError as e:
        logger.error(f"LLM provider unavailable: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "success": False,
                "error_code": e.error_code,
                "message": e.message,
                "is_retryable": True,
                "details": e.details,
            },
        )
    except LLMError as e:
        logger.error(f"LLM error [{e.error_code}]: {e.message}")
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
    except Exception as e:
        logger.exception(f"Unexpected error during LLM generation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error_code": "INTERNAL_LLM_ERROR",
                "message": "An internal error occurred during LLM generation",
                "is_retryable": True,
            },
        )
