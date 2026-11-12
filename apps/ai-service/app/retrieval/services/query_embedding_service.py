"""Query vector embedding service."""

from typing import List, Tuple
from app.embeddings.provider_factory import get_embedding_provider
from app.embeddings.services.token_estimator import TokenEstimator
from app.embeddings.services.embedding_validation_service import EmbeddingValidationService
from app.retrieval.exceptions import (
    RetrievalDimensionMismatchError,
    RetrievalProviderError,
    RetrievalError,
)


class QueryEmbeddingService:
    """Generates and validates dense vector embeddings for search queries."""

    @staticmethod
    def parse_embedding_space(embedding_space: str) -> Tuple[str, str, int]:
        """Parses '{provider}:{model}:{dimensions}' string into its components."""
        parts = embedding_space.split(":")
        if len(parts) != 3:
            raise RetrievalError(
                f"Invalid embedding space format: '{embedding_space}'. Expected 'provider:model:dimensions'",
                error_code="INVALID_EMBEDDING_SPACE",
            )
        provider = parts[0]
        model = parts[1]
        try:
            dimensions = int(parts[2])
        except ValueError:
            raise RetrievalError(
                f"Invalid dimensions '{parts[2]}' in embedding space '{embedding_space}'",
                error_code="INVALID_EMBEDDING_SPACE",
            )
        return provider, model, dimensions

    async def generate_query_embedding(self, query: str, embedding_space: str) -> List[float]:
        """Generates a dense vector representation of the query in the exact embedding space.

        Args:
            query: Clean normalized query text.
            embedding_space: Target space, e.g. 'openai:text-embedding-3-small:1536'.

        Returns:
            Unit-normalized float vector matching the embedding space dimensions.
        """
        provider_name, model_name, expected_dims = self.parse_embedding_space(embedding_space)

        # 1. Validate query tokens
        token_estimator = TokenEstimator(model=model_name)
        token_estimator.validate_text(query)

        # 2. Retrieve provider from factory
        try:
            provider = get_embedding_provider(
                provider_name=provider_name,
                model=model_name,
                dimensions=expected_dims,
            )
        except Exception as e:
            raise RetrievalProviderError(f"Failed to initialize provider '{provider_name}': {str(e)}")

        # 3. Call embed_query
        try:
            vector = await provider.embed_query(query)
        except Exception as e:
            raise RetrievalProviderError(f"Embedding provider '{provider_name}' query error: {str(e)}")

        # 4. Validate vector structural integrity and dimensionality
        if len(vector) != expected_dims:
            raise RetrievalDimensionMismatchError(expected=expected_dims, actual=len(vector))

        EmbeddingValidationService.validate_vector(
            vector=vector,
            expected_dimensions=expected_dims,
            chunk_index=0,
        )

        return vector
