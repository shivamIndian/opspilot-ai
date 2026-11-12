"""Comprehensive tests for RAG retrieval engine."""

import uuid
from unittest.mock import patch, AsyncMock
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.config.settings import settings
from app.retrieval.services.query_normalizer import QueryNormalizer
from app.retrieval.services.query_embedding_service import QueryEmbeddingService
from app.retrieval.services.semantic_search_service import SemanticSearchItem
from app.retrieval.services.keyword_search_service import KeywordSearchItem
from app.retrieval.services.rrf_fusion_service import RrfFusionService
from app.retrieval.schemas import (
    InternalSearchResponse,
    InternalSearchData,
    CandidateChunk,
    SearchDiagnostics,
)
from app.retrieval.exceptions import (
    RetrievalQueryEmptyError,
    RetrievalQueryTooLongError,
    RetrievalError,
)


class TestQueryNormalizer:
    def test_whitespace_and_newlines_collapse(self):
        raw = "   How   to   reset\n\tpassword?   "
        normalized = QueryNormalizer.normalize(raw)
        assert normalized == "How to reset password?"

    def test_unicode_nfc_normalization(self):
        decomposed = "e\u0301cole"
        raw = f"Searching for {decomposed} guidelines"
        normalized = QueryNormalizer.normalize(raw)
        assert "école" in normalized

    def test_control_character_stripping(self):
        raw = "Account\x00\x08security\x0cpolicy"
        normalized = QueryNormalizer.normalize(raw)
        assert normalized == "Accountsecuritypolicy"

    def test_empty_query_rejection(self):
        with pytest.raises(RetrievalQueryEmptyError) as exc_info:
            QueryNormalizer.normalize("   \t  \n  ")
        assert exc_info.value.error_code == "RETRIEVAL_QUERY_EMPTY"

    def test_excessive_length_rejection(self):
        long_query = "word " * 250  # > 1000 chars
        with pytest.raises(RetrievalQueryTooLongError) as exc_info:
            QueryNormalizer.normalize(long_query, max_length=100)
        assert exc_info.value.error_code == "RETRIEVAL_QUERY_TOO_LONG"


class TestQueryEmbeddingService:
    def test_parse_embedding_space_valid(self):
        provider, model, dims = QueryEmbeddingService.parse_embedding_space(
            "openai:text-embedding-3-small:1536"
        )
        assert provider == "openai"
        assert model == "text-embedding-3-small"
        assert dims == 1536

    def test_parse_embedding_space_invalid(self):
        with pytest.raises(RetrievalError):
            QueryEmbeddingService.parse_embedding_space("invalid-format")

        with pytest.raises(RetrievalError):
            QueryEmbeddingService.parse_embedding_space("provider:model:not_an_int")

    @pytest.mark.asyncio
    async def test_generate_query_embedding_mock(self):
        service = QueryEmbeddingService()
        vec = await service.generate_query_embedding(
            query="Company travel expense policy",
            embedding_space="mock:text-embedding-3-small:1536",
        )
        assert len(vec) == 1536
        assert all(isinstance(v, float) for v in vec)


class TestRrfFusionService:
    def test_fusion_and_deduplication(self):
        doc1 = uuid.uuid4()
        doc2 = uuid.uuid4()
        chunk1 = uuid.uuid4()
        chunk2 = uuid.uuid4()
        chunk3 = uuid.uuid4()
        org_id = uuid.uuid4()
        run_id = uuid.uuid4()

        # Semantic candidates: chunk1 (rank 1), chunk2 (rank 2)
        sem_items = [
            SemanticSearchItem(
                chunk_id=chunk1,
                document_id=doc1,
                organization_id=org_id,
                processing_run_id=run_id,
                processing_generation=1,
                chunk_index=0,
                content="Chunk 1 content regarding reset password.",
                char_start=0,
                char_end=40,
                page_start=1,
                page_end=1,
                section_title="Security",
                chunk_metadata={},
                cosine_distance=0.15,
                cosine_similarity=0.85,
                rank=1,
            ),
            SemanticSearchItem(
                chunk_id=chunk2,
                document_id=doc1,
                organization_id=org_id,
                processing_run_id=run_id,
                processing_generation=1,
                chunk_index=1,
                content="Chunk 2 content regarding MFA verification.",
                char_start=41,
                char_end=85,
                page_start=1,
                page_end=1,
                section_title="Security",
                chunk_metadata={},
                cosine_distance=0.25,
                cosine_similarity=0.75,
                rank=2,
            ),
        ]

        # Keyword candidates: chunk1 (rank 2), chunk3 (rank 1)
        kw_items = [
            KeywordSearchItem(
                chunk_id=chunk3,
                document_id=doc2,
                organization_id=org_id,
                processing_run_id=run_id,
                processing_generation=1,
                chunk_index=0,
                content="Chunk 3 IT support contact table.",
                char_start=0,
                char_end=35,
                page_start=5,
                page_end=5,
                section_title="Helpdesk",
                chunk_metadata={},
                keyword_score=0.45,
                rank=1,
            ),
            KeywordSearchItem(
                chunk_id=chunk1,
                document_id=doc1,
                organization_id=org_id,
                processing_run_id=run_id,
                processing_generation=1,
                chunk_index=0,
                content="Chunk 1 content regarding reset password.",
                char_start=0,
                char_end=40,
                page_start=1,
                page_end=1,
                section_title="Security",
                chunk_metadata={},
                keyword_score=0.30,
                rank=2,
            ),
        ]

        results = RrfFusionService.fuse_and_rank(
            semantic_items=sem_items,
            keyword_items=kw_items,
            top_k=5,
            rrf_k=60,
        )

        assert len(results) == 3
        # Chunk 1 appears in both (rank 1 sem + rank 2 kw) => highest RRF score
        assert results[0].chunk_id == chunk1
        assert results[0].retrieval_method == "hybrid"
        assert results[0].semantic_rank == 1
        assert results[0].keyword_rank == 2

        # Expected RRF score for chunk 1: 1/(60+1) + 1/(60+2) = 1/61 + 1/62 ≈ 0.016393 + 0.016129 ≈ 0.032522
        expected_c1_score = round(1 / 61 + 1 / 62, 6)
        assert abs(results[0].score - expected_c1_score) < 1e-4

        # Chunk 3 was keyword only
        c3 = next(r for r in results if r.chunk_id == chunk3)
        assert c3.retrieval_method == "keyword"
        assert c3.keyword_rank == 1
        assert c3.semantic_rank is None

        # Chunk 2 was semantic only
        c2 = next(r for r in results if r.chunk_id == chunk2)
        assert c2.retrieval_method == "semantic"
        assert c2.semantic_rank == 2
        assert c2.keyword_rank is None

    def test_diversity_limit_per_document(self):
        doc1 = uuid.uuid4()
        org_id = uuid.uuid4()
        run_id = uuid.uuid4()

        sem_items = [
            SemanticSearchItem(
                chunk_id=uuid.uuid4(),
                document_id=doc1,
                organization_id=org_id,
                processing_run_id=run_id,
                processing_generation=1,
                chunk_index=i,
                content=f"Chunk {i} from doc 1",
                char_start=0,
                char_end=10,
                page_start=1,
                page_end=1,
                section_title="Sec",
                chunk_metadata={},
                cosine_distance=0.1 * i,
                cosine_similarity=1.0 - 0.1 * i,
                rank=i,
            )
            for i in range(1, 6)
        ]

        results = RrfFusionService.fuse_and_rank(
            semantic_items=sem_items,
            keyword_items=[],
            top_k=5,
            rrf_k=60,
            max_chunks_per_doc=2,
        )

        assert len(results) == 2


class TestInternalRetrievalApiEndpoint:
    @pytest.mark.asyncio
    async def test_auth_unauthorized_without_token(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/internal/v1/retrieval/search",
                json={
                    "organization_id": str(uuid.uuid4()),
                    "query": "How to reset account password?",
                    "top_k": 5,
                    "retrieval_mode": "hybrid",
                    "embedding_space": "mock:text-embedding-3-small:1536",
                },
            )
            assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_successful_search_with_mock_service(self):
        transport = ASGITransport(app=app)
        headers = {"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"}
        org_id = uuid.uuid4()
        doc_id = uuid.uuid4()
        chunk_id = uuid.uuid4()

        mock_candidate = CandidateChunk(
            chunk_id=chunk_id,
            document_id=doc_id,
            organization_id=org_id,
            processing_run_id=uuid.uuid4(),
            processing_generation=1,
            chunk_index=0,
            content="To reset your password, visit the settings page.",
            char_start=0,
            char_end=50,
            page_start=3,
            page_end=3,
            section_title="Security and Credentials",
            chunk_metadata={},
            semantic_rank=1,
            semantic_score=0.91,
            keyword_rank=1,
            keyword_score=0.45,
            score=0.032,
            score_type="rrf",
            retrieval_method="hybrid",
        )

        mock_diagnostics = SearchDiagnostics(
            query_normalized="how to reset password?",
            embedding_space="mock:text-embedding-3-small:1536",
            semantic_candidates=1,
            keyword_candidates=1,
            combined_candidates=2,
            returned_results=1,
            embedding_duration_ms=10,
            search_duration_ms=15,
            total_duration_ms=25,
            degraded_mode=None,
        )

        mock_response = InternalSearchResponse(
            success=True,
            data=InternalSearchData(
                organization_id=org_id,
                query="how to reset password?",
                retrieval_mode="hybrid",
                embedding_space="mock:text-embedding-3-small:1536",
                result_count=1,
                results=[mock_candidate],
                diagnostics=mock_diagnostics,
            ),
        )

        with patch("app.retrieval.router.retrieval_service.search", new_callable=AsyncMock) as mock_search:
            mock_search.return_value = mock_response

            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/internal/v1/retrieval/search",
                    headers=headers,
                    json={
                        "organization_id": str(org_id),
                        "query": "How to reset password?",
                        "top_k": 5,
                        "retrieval_mode": "hybrid",
                        "embedding_space": "mock:text-embedding-3-small:1536",
                    },
                )
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["data"]["result_count"] == 1
                assert data["data"]["results"][0]["chunk_id"] == str(chunk_id)
                assert data["data"]["results"][0]["retrieval_method"] == "hybrid"
                assert data["data"]["results"][0]["score_type"] == "rrf"

    @pytest.mark.asyncio
    async def test_empty_query_validation_error(self):
        transport = ASGITransport(app=app)
        headers = {"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"}
        org_id = uuid.uuid4()

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/internal/v1/retrieval/search",
                headers=headers,
                json={
                    "organization_id": str(org_id),
                    "query": "",  # Empty query
                    "top_k": 5,
                    "retrieval_mode": "hybrid",
                    "embedding_space": "mock:text-embedding-3-small:1536",
                },
            )
            assert response.status_code in (400, 422)
