"""Embedding orchestration service executing batch vector generation and persistence."""

import time
import uuid
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.settings import settings
from app.embeddings.base import format_embedding_space
from app.embeddings.provider_factory import get_embedding_provider
from app.embeddings.services.token_estimator import TokenEstimator
from app.embeddings.services.embedding_batch_service import EmbeddingBatchService
from app.embeddings.repositories.embedding_repository import EmbeddingRepository
from app.embeddings.schemas import GenerateEmbeddingsRequest, GenerateEmbeddingsResponse, EmbeddingSummary
from app.embeddings.exceptions import (
    DocumentChunksNotFoundError,
    ProcessingGenerationMismatchError,
    EmbeddingError,
)


class EmbeddingService:
    """Orchestrates end-to-end embedding generation, batching, validation, and storage."""

    def __init__(self, repo: EmbeddingRepository = EmbeddingRepository()):
        self.repo = repo

    async def generate_document_embeddings(
        self,
        session: AsyncSession,
        request: GenerateEmbeddingsRequest,
    ) -> GenerateEmbeddingsResponse:
        """Processes chunks of a document generation and generates vector embeddings."""
        start_time = time.time()
        org_id = request.organization_id
        doc_id = request.document_id
        proc_gen = request.processing_generation

        # 1. Authoritative verification of processing run
        run = await self.repo.get_processing_run(
            session=session,
            organization_id=org_id,
            document_id=doc_id,
            processing_generation=proc_gen,
        )
        if not run:
            raise DocumentChunksNotFoundError(
                f"No processing run found for doc={doc_id}, generation={proc_gen}"
            )
        if run.status != "completed":
            raise ProcessingGenerationMismatchError(
                f"Processing run for doc={doc_id}, generation={proc_gen} is in '{run.status}' state, not 'completed'"
            )

        # 2. Resolve embedding provider & canonical embedding space
        provider = get_embedding_provider(
            provider_name=request.provider,
            model=request.model,
            dimensions=request.dimensions,
        )
        embedding_space = format_embedding_space(
            provider=provider.provider_name,
            model=provider.model,
            dimensions=provider.dimensions,
        )

        # 3. Retrieve chunks strictly for this generation & organization
        chunks = await self.repo.get_chunks_for_generation(
            session=session,
            organization_id=org_id,
            document_id=doc_id,
            processing_run_id=run.id,
        )
        if not chunks:
            raise DocumentChunksNotFoundError(
                f"Document {doc_id} has no chunks recorded for processing generation {proc_gen}"
            )

        total_chunks = len(chunks)

        # 4. Idempotency check: detect already valid embeddings with matching content hash
        existing_map = await self.repo.get_existing_embeddings_map(
            session=session,
            chunk_ids=[c.id for c in chunks],
            embedding_space=embedding_space,
        )

        chunks_to_embed = [
            c for c in chunks
            if existing_map.get(c.id) != c.content_hash
        ]

        # 5. If all chunks already have valid embeddings, return immediately
        if not chunks_to_embed:
            duration_ms = int((time.time() - start_time) * 1000)
            return GenerateEmbeddingsResponse(
                success=True,
                data=EmbeddingSummary(
                    organization_id=org_id,
                    document_id=doc_id,
                    embedding_generation=request.embedding_generation,
                    provider=provider.provider_name,
                    model=provider.model,
                    dimensions=provider.dimensions,
                    embedding_space=embedding_space,
                    total_chunks=total_chunks,
                    embedded_chunks=total_chunks,
                    failed_chunks=0,
                    status="completed",
                    duration_ms=duration_ms,
                ),
            )

        # 6. Prepare batching and token limits
        token_estimator = TokenEstimator(model=provider.model)
        batch_service = EmbeddingBatchService(
            token_estimator=token_estimator,
            batch_size=settings.EMBEDDING_BATCH_SIZE,
        )

        # Prepare (chunk_id, content) pairs for batch service
        chunk_tuples = [(str(c.id), c.content) for c in chunks_to_embed]
        batches = batch_service.validate_and_create_batches(chunk_tuples)

        # Map string id back to DocumentChunk instance for fast lookup
        chunk_map = {str(c.id): c for c in chunks_to_embed}

        # 7. Execute batch embedding generation and persistence
        for batch in batches:
            texts = [content for (_, content) in batch]
            batch_chunk_ids = [cid for (cid, _) in batch]

            vectors = await provider.embed_documents(texts)

            records: List[Dict[str, any]] = []
            for cid, vector in zip(batch_chunk_ids, vectors):
                chunk_obj = chunk_map[cid]
                records.append({
                    "organization_id": org_id,
                    "document_id": doc_id,
                    "processing_run_id": run.id,
                    "chunk_id": chunk_obj.id,
                    "provider": provider.provider_name,
                    "model": provider.model,
                    "dimensions": provider.dimensions,
                    "embedding_space": embedding_space,
                    "content_hash": chunk_obj.content_hash,
                    "embedding": vector,
                })

            await self.repo.bulk_upsert_embeddings(session=session, records=records)
            await session.commit()

        # 8. Query authoritative final count
        final_count = await self.repo.count_embeddings(
            session=session,
            processing_run_id=run.id,
            embedding_space=embedding_space,
        )

        duration_ms = int((time.time() - start_time) * 1000)

        return GenerateEmbeddingsResponse(
            success=True,
            data=EmbeddingSummary(
                organization_id=org_id,
                document_id=doc_id,
                embedding_generation=request.embedding_generation,
                provider=provider.provider_name,
                model=provider.model,
                dimensions=provider.dimensions,
                embedding_space=embedding_space,
                total_chunks=total_chunks,
                embedded_chunks=final_count,
                failed_chunks=0,
                status="completed",
                duration_ms=duration_ms,
            ),
        )


embedding_service = EmbeddingService()
