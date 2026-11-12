"""Repository for ai.document_processing_runs persistence."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.document_processing.models.processing_run import DocumentProcessingRun
from app.document_processing.models.document_chunk import DocumentChunk


class ProcessingRunRepository:
    """Manages transactional lifecycle of document processing runs in ai schema."""

    async def get_by_generation(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
        processing_generation: int,
    ) -> Optional[DocumentProcessingRun]:
        stmt = select(DocumentProcessingRun).where(
            DocumentProcessingRun.organization_id == organization_id,
            DocumentProcessingRun.document_id == document_id,
            DocumentProcessingRun.processing_generation == processing_generation,
        )
        result = await session.execute(stmt)
        return result.scalars().first()

    async def create_or_initialize_run(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
        processing_generation: int,
        pipeline_version: str,
        source_checksum: str,
        extraction_method: Optional[str] = None,
    ) -> DocumentProcessingRun:
        """Atomically prepares a processing run record, resetting any partial attempt for this generation."""
        existing = await self.get_by_generation(
            session, organization_id, document_id, processing_generation
        )

        now = datetime.utcnow()

        if existing:
            # Delete any partial chunks from a previously interrupted attempt for this generation
            await session.execute(
                delete(DocumentChunk).where(DocumentChunk.processing_run_id == existing.id)
            )

            existing.pipeline_version = pipeline_version
            existing.source_checksum = source_checksum
            existing.status = "processing"
            existing.extraction_method = extraction_method
            existing.error_code = None
            existing.chunk_count = 0
            existing.started_at = now
            existing.completed_at = None
            existing.updated_at = now
            await session.flush()
            return existing

        new_run = DocumentProcessingRun(
            organization_id=organization_id,
            document_id=document_id,
            processing_generation=processing_generation,
            pipeline_version=pipeline_version,
            source_checksum=source_checksum,
            status="processing",
            extraction_method=extraction_method,
            chunk_count=0,
            started_at=now,
            created_at=now,
            updated_at=now,
        )
        session.add(new_run)
        await session.flush()
        return new_run

    async def complete_run(
        self,
        session: AsyncSession,
        run_id: uuid.UUID,
        page_count: Optional[int],
        extracted_char_count: int,
        chunk_count: int,
    ) -> DocumentProcessingRun:
        run = await session.get(DocumentProcessingRun, run_id)
        if not run:
            raise ValueError(f"Processing run {run_id} not found")

        now = datetime.utcnow()
        run.status = "completed"
        run.page_count = page_count
        run.extracted_char_count = extracted_char_count
        run.chunk_count = chunk_count
        run.error_code = None
        run.completed_at = now
        run.updated_at = now
        await session.flush()
        return run

    async def fail_run(
        self,
        session: AsyncSession,
        run_id: uuid.UUID,
        error_code: str,
    ) -> DocumentProcessingRun:
        run = await session.get(DocumentProcessingRun, run_id)
        if not run:
            raise ValueError(f"Processing run {run_id} not found")

        now = datetime.utcnow()
        run.status = "failed"
        run.error_code = error_code
        run.completed_at = now
        run.updated_at = now
        await session.flush()
        return run


processing_run_repository = ProcessingRunRepository()
