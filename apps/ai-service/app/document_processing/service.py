"""Orchestration service for document text extraction, chunking, and persistence."""

import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.settings import settings
from app.document_processing.extraction import get_extractor
from app.document_processing.chunking.splitter import DocumentSplitter
from app.document_processing.repositories import (
    processing_run_repository,
    ProcessingRunRepository,
    document_chunk_repository,
    DocumentChunkRepository,
)
from app.document_processing.schemas import ProcessDocumentResponse
from app.document_processing.exceptions import (
    DocumentProcessingError,
    InternalProcessingError,
)
from app.core.logging import get_logger

logger = get_logger("opspilot_ai.document_processing")


class DocumentProcessingService:
    """Coordinates parsing, normalization, chunking, and atomic storage in the ai schema."""

    def __init__(
        self,
        run_repo: ProcessingRunRepository = processing_run_repository,
        chunk_repo: DocumentChunkRepository = document_chunk_repository,
        splitter: Optional[DocumentSplitter] = None,
    ):
        self.run_repo = run_repo
        self.chunk_repo = chunk_repo
        self.splitter = splitter or DocumentSplitter()

    async def process_document(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
        processing_generation: int,
        pipeline_version: str,
        source_checksum: str,
        file_extension: str,
        file_bytes: bytes,
        original_filename: str = "",
    ) -> ProcessDocumentResponse:
        logger.info(
            f"Starting processing for doc={document_id}, gen={processing_generation}, "
            f"ext={file_extension}, size={len(file_bytes)} bytes"
        )

        # 1. Resolve format-specific extractor
        extractor = get_extractor(file_extension)

        # 2. Idempotently prepare the processing run record
        run = await self.run_repo.create_or_initialize_run(
            session=session,
            organization_id=organization_id,
            document_id=document_id,
            processing_generation=processing_generation,
            pipeline_version=pipeline_version or settings.PIPELINE_VERSION,
            source_checksum=source_checksum,
            extraction_method=extractor.__class__.__name__,
        )
        await session.commit()

        try:
            # 3. Extract text page-by-page or block-by-block
            extracted_doc = extractor.extract(file_bytes, original_filename)

            # 4. Generate deterministic chunks with overlap and metadata
            chunks = self.splitter.split_document(extracted_doc)

            # 5. Persist chunks in the ai schema
            saved_chunk_count = await self.chunk_repo.bulk_insert_chunks(
                session=session,
                organization_id=organization_id,
                document_id=document_id,
                processing_run_id=run.id,
                chunks=chunks,
            )

            # 6. Mark processing run completed
            completed_run = await self.run_repo.complete_run(
                session=session,
                run_id=run.id,
                page_count=extracted_doc.page_count,
                extracted_char_count=len(extracted_doc.full_text),
                chunk_count=saved_chunk_count,
            )
            await session.commit()

            logger.info(
                f"Successfully completed processing for doc={document_id}, "
                f"chunks={saved_chunk_count}, chars={len(extracted_doc.full_text)}"
            )

            return ProcessDocumentResponse(
                success=True,
                processing_run_id=completed_run.id,
                organization_id=organization_id,
                document_id=document_id,
                processing_generation=processing_generation,
                status="completed",
                page_count=completed_run.page_count,
                extracted_char_count=completed_run.extracted_char_count or 0,
                chunk_count=completed_run.chunk_count,
                pipeline_version=completed_run.pipeline_version,
                error_code=None,
            )

        except DocumentProcessingError as dpe:
            logger.warning(
                f"Document processing failed with expected error {dpe.error_code}: {dpe.message}"
            )
            await self.run_repo.fail_run(session, run.id, dpe.error_code)
            await session.commit()
            raise dpe

        except Exception as e:
            logger.error(f"Unexpected internal processing exception: {str(e)}", exc_info=True)
            await self.run_repo.fail_run(session, run.id, "INTERNAL_PROCESSING_ERROR")
            await session.commit()
            raise InternalProcessingError(str(e))


document_processing_service = DocumentProcessingService()
