import math
import uuid
from unittest.mock import patch, AsyncMock
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.config.settings import settings
from app.embeddings.services.token_estimator import TokenEstimator
from app.embeddings.services.embedding_validation_service import EmbeddingValidationService
from app.embeddings.services.embedding_batch_service import EmbeddingBatchService
from app.embeddings.providers.mock_provider import MockEmbeddingProvider
from app.embeddings.base import format_embedding_space
from app.embeddings.exceptions import (
    EmbeddingDimensionMismatchError,
    EmbeddingInvalidResponseError,
    EmbeddingInputTooLargeError,
    DocumentChunksNotFoundError,
    EmbeddingError,
)
from app.embeddings.schemas import GenerateEmbeddingsResponse, EmbeddingSummary


class TestTokenEstimator:
    def test_token_counting(self):
        estimator = TokenEstimator("text-embedding-3-small")
        count = estimator.count_tokens("Hello world, this is a test.")
        assert count > 0
        assert count < 20

    def test_token_limit_validation_pass(self):
        estimator = TokenEstimator("text-embedding-3-small")
        short_text = "This is a brief piece of text well within limits."
        tokens = estimator.validate_text(short_text, chunk_index=0)
        assert tokens > 0

    def test_token_limit_validation_exceeded(self):
        estimator = TokenEstimator("text-embedding-3-small")
        # 8192+ tokens
        huge_text = "word " * 9000
        with pytest.raises(EmbeddingInputTooLargeError) as exc_info:
            estimator.validate_text(huge_text, chunk_index=42)
        assert exc_info.value.error_code == "EMBEDDING_INPUT_TOO_LARGE"
        assert "42" in exc_info.value.message


class TestEmbeddingValidationService:
    def test_valid_vector(self):
        valid_vec = [0.01] * 1536
        EmbeddingValidationService.validate_vector(valid_vec, expected_dimensions=1536, chunk_index=0)

    def test_dimension_mismatch(self):
        short_vec = [0.1] * 512
        with pytest.raises(EmbeddingDimensionMismatchError) as exc_info:
            EmbeddingValidationService.validate_vector(short_vec, expected_dimensions=1536, chunk_index=1)
        assert exc_info.value.error_code == "EMBEDDING_DIMENSION_MISMATCH"
        assert "1536" in exc_info.value.message

    def test_nan_rejection(self):
        nan_vec = [0.1] * 1535 + [float("nan")]
        with pytest.raises(EmbeddingInvalidResponseError) as exc_info:
            EmbeddingValidationService.validate_vector(nan_vec, expected_dimensions=1536, chunk_index=2)
        assert exc_info.value.error_code == "EMBEDDING_INVALID_RESPONSE"
        assert "NaN" in exc_info.value.message

    def test_inf_rejection(self):
        inf_vec = [0.1] * 1535 + [float("inf")]
        with pytest.raises(EmbeddingInvalidResponseError) as exc_info:
            EmbeddingValidationService.validate_vector(inf_vec, expected_dimensions=1536, chunk_index=3)
        assert exc_info.value.error_code == "EMBEDDING_INVALID_RESPONSE"
        assert "infinite" in exc_info.value.message.lower()

    def test_count_mismatch_batch(self):
        vectors = [[0.1] * 1536]
        with pytest.raises(EmbeddingInvalidResponseError) as exc_info:
            EmbeddingValidationService.validate_batch(vectors, expected_count=2, expected_dimensions=1536)
        assert exc_info.value.error_code == "EMBEDDING_INVALID_RESPONSE"


class TestMockEmbeddingProvider:
    @pytest.mark.asyncio
    async def test_deterministic_and_normalized(self):
        provider = MockEmbeddingProvider(dimensions=1536)
        text = "Enterprise knowledge management"

        res1 = await provider.embed_documents([text])
        res2 = await provider.embed_documents([text])

        assert len(res1) == 1
        assert len(res1[0]) == 1536
        # Deterministic
        assert res1[0] == res2[0]

        # L2 norm should be approximately 1.0
        norm = math.sqrt(sum(x * x for x in res1[0]))
        assert abs(norm - 1.0) < 1e-4

    @pytest.mark.asyncio
    async def test_embed_query(self):
        provider = MockEmbeddingProvider(dimensions=1536)
        vec = await provider.embed_query("search query")
        assert len(vec) == 1536
        assert isinstance(vec[0], float)

    @pytest.mark.asyncio
    async def test_batch_multiple_texts(self):
        provider = MockEmbeddingProvider(dimensions=1536)
        texts = ["Text one", "Text two", "Text three"]
        res = await provider.embed_documents(texts)
        assert len(res) == 3
        assert res[0] != res[1]


class TestEmbeddingBatchService:
    def test_batch_slicing(self):
        estimator = TokenEstimator("text-embedding-3-small")
        batch_service = EmbeddingBatchService(token_estimator=estimator, batch_size=2)
        items = [
            ("id-1", "Text one"),
            ("id-2", "Text two"),
            ("id-3", "Text three"),
            ("id-4", "Text four"),
            ("id-5", "Text five"),
        ]
        batches = batch_service.validate_and_create_batches(items)
        assert len(batches) == 3
        assert len(batches[0]) == 2
        assert len(batches[1]) == 2
        assert len(batches[2]) == 1

    def test_empty_content_rejection(self):
        estimator = TokenEstimator("text-embedding-3-small")
        batch_service = EmbeddingBatchService(token_estimator=estimator, batch_size=64)
        chunks = [
            ("id-1", "Valid text"),
            ("id-2", "   \n\t  "),
        ]
        with pytest.raises(EmbeddingError) as exc_info:
            batch_service.validate_and_create_batches(chunks)
        assert exc_info.value.error_code == "EMPTY_CHUNK_CONTENT"


class TestEmbeddingApiEndpoints:
    @pytest.mark.asyncio
    async def test_auth_unauthorized_without_header(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/internal/v1/embeddings/generate",
                json={
                    "document_id": str(uuid.uuid4()),
                    "organization_id": str(uuid.uuid4()),
                    "processing_generation": 1,
                    "embedding_generation": 1,
                },
            )
            assert response.status_code == 401
            data = response.json()
            assert data["detail"]["error_code"] == "MISSING_SERVICE_TOKEN"

    @pytest.mark.asyncio
    async def test_auth_forbidden_with_bad_token(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/internal/v1/embeddings/generate",
                headers={"Authorization": "Bearer invalid-token"},
                json={
                    "document_id": str(uuid.uuid4()),
                    "organization_id": str(uuid.uuid4()),
                    "processing_generation": 1,
                    "embedding_generation": 1,
                },
            )
            assert response.status_code == 401
            data = response.json()
            assert data["detail"]["error_code"] == "UNAUTHORIZED_SERVICE"

    @pytest.mark.asyncio
    async def test_generate_embeddings_success_mock(self):
        transport = ASGITransport(app=app)
        headers = {"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"}

        doc_id = uuid.uuid4()
        org_id = uuid.uuid4()

        mock_response = GenerateEmbeddingsResponse(
            success=True,
            data=EmbeddingSummary(
                document_id=doc_id,
                organization_id=org_id,
                embedding_generation=1,
                embedding_space="mock:text-embedding-3-small:1536",
                provider="mock",
                model="text-embedding-3-small",
                dimensions=1536,
                total_chunks=1,
                embedded_chunks=1,
                failed_chunks=0,
                status="completed",
                duration_ms=45,
            ),
        )

        with patch("app.embeddings.router.embedding_service.generate_document_embeddings", new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_response

            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/internal/v1/embeddings/generate",
                    headers=headers,
                    json={
                        "document_id": str(doc_id),
                        "organization_id": str(org_id),
                        "processing_generation": 1,
                        "embedding_generation": 1,
                    },
                )
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["data"]["embedded_chunks"] == 1
                assert data["data"]["dimensions"] == 1536
                assert data["data"]["embedding_space"] == "mock:text-embedding-3-small:1536"

    @pytest.mark.asyncio
    async def test_generate_embeddings_not_found_error(self):
        transport = ASGITransport(app=app)
        headers = {"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"}

        doc_id = uuid.uuid4()
        org_id = uuid.uuid4()

        with patch("app.embeddings.router.embedding_service.generate_document_embeddings", new_callable=AsyncMock) as mock_generate:
            mock_generate.side_effect = DocumentChunksNotFoundError("No chunks found for document")

            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/internal/v1/embeddings/generate",
                    headers=headers,
                    json={
                        "document_id": str(doc_id),
                        "organization_id": str(org_id),
                        "processing_generation": 1,
                        "embedding_generation": 1,
                    },
                )
                assert response.status_code == 422
                data = response.json()
                assert data["detail"]["error_code"] == "DOCUMENT_CHUNKS_NOT_FOUND"
                assert data["detail"]["is_retryable"] is False
