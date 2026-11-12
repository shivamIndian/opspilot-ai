"""Internal authenticated router for document processing."""

import uuid
import secrets
from typing import Annotated
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    UploadFile,
    Header,
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.settings import settings
from app.database.session import get_async_session
from app.document_processing.service import (
    document_processing_service,
    DocumentProcessingService,
)
from app.document_processing.schemas import ProcessDocumentResponse
from app.document_processing.exceptions import DocumentProcessingError

router = APIRouter(prefix="/internal/v1/documents", tags=["internal-document-processing"])


def verify_internal_service_token(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    """Validates service-to-service internal bearer token using constant-time comparison."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "MISSING_SERVICE_TOKEN", "message": "Authorization header is required"},
        )

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "INVALID_TOKEN_FORMAT", "message": "Bearer token format required"},
        )

    provided_token = parts[1]
    expected_token = settings.AI_SERVICE_INTERNAL_TOKEN

    if not secrets.compare_digest(provided_token.encode("utf-8"), expected_token.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "UNAUTHORIZED_SERVICE", "message": "Invalid service authentication token"},
        )


@router.post(
    "/process",
    response_model=ProcessDocumentResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
)
async def process_document_endpoint(
    file: UploadFile = File(...),
    organization_id: uuid.UUID = Form(...),
    document_id: uuid.UUID = Form(...),
    processing_generation: int = Form(...),
    source_checksum: str = Form(...),
    pipeline_version: str = Form("document-pipeline-v1"),
    file_extension: str = Form(...),
    session: AsyncSession = Depends(get_async_session),
    service: DocumentProcessingService = Depends(lambda: document_processing_service),
) -> ProcessDocumentResponse:
    """Internal service endpoint called by Node.js background workers."""
    try:
        file_bytes = await file.read()

        response = await service.process_document(
            session=session,
            organization_id=organization_id,
            document_id=document_id,
            processing_generation=processing_generation,
            pipeline_version=pipeline_version,
            source_checksum=source_checksum,
            file_extension=file_extension,
            file_bytes=file_bytes,
            original_filename=file.filename or "",
        )
        return response

    except DocumentProcessingError as e:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR if e.is_retryable else status.HTTP_422_UNPROCESSABLE_ENTITY
        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "error_code": e.error_code,
                "message": e.message,
                "is_retryable": e.is_retryable,
            },
        )
