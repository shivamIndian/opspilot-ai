"""Validation service for raw embedding vectors."""

import math
from typing import List
from app.embeddings.exceptions import (
    EmbeddingDimensionMismatchError,
    EmbeddingInvalidResponseError,
)


class EmbeddingValidationService:
    """Validates structural and numeric integrity of generated vector embeddings."""

    @staticmethod
    def validate_vector(vector: List[float], expected_dimensions: int, chunk_index: int = 0) -> None:
        """Validates a single vector against dimensionality and numeric integrity constraints."""
        if not vector or not isinstance(vector, list):
            raise EmbeddingInvalidResponseError(
                f"Vector for chunk index {chunk_index} is empty or not a list"
            )

        if len(vector) != expected_dimensions:
            raise EmbeddingDimensionMismatchError(
                f"Vector dimension mismatch at chunk {chunk_index}: expected {expected_dimensions}, got {len(vector)}"
            )

        for dim_idx, val in enumerate(vector):
            if not isinstance(val, (int, float)):
                raise EmbeddingInvalidResponseError(
                    f"Non-numeric value detected at chunk {chunk_index}, dimension {dim_idx}: {type(val)}"
                )
            if math.isnan(val):
                raise EmbeddingInvalidResponseError(
                    f"NaN float value detected at chunk {chunk_index}, dimension {dim_idx}"
                )
            if math.isinf(val):
                raise EmbeddingInvalidResponseError(
                    f"Infinite float value detected at chunk {chunk_index}, dimension {dim_idx}"
                )

    @classmethod
    def validate_batch(
        cls,
        vectors: List[List[float]],
        expected_count: int,
        expected_dimensions: int,
    ) -> None:
        """Validates a batch of vectors matching the input batch count and dimensions."""
        if len(vectors) != expected_count:
            raise EmbeddingInvalidResponseError(
                f"Provider returned {len(vectors)} vectors for batch of {expected_count} inputs"
            )

        for idx, vec in enumerate(vectors):
            cls.validate_vector(vec, expected_dimensions, chunk_index=idx)
