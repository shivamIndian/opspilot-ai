"""Batch splitting and concurrency management for embedding requests."""

from typing import List, Tuple
from app.embeddings.services.token_estimator import TokenEstimator
from app.embeddings.exceptions import EmbeddingError


class EmbeddingBatchService:
    """Manages batch slicing, input validation, and token boundaries."""

    def __init__(self, token_estimator: TokenEstimator, batch_size: int = 64):
        self.token_estimator = token_estimator
        self.batch_size = max(1, batch_size)

    def validate_and_create_batches(
        self,
        chunks: List[Tuple[str, str]],  # (chunk_id, content)
    ) -> List[List[Tuple[str, str]]]:
        """Validates all chunk inputs for token limits and splits into uniform batches.

        Args:
            chunks: List of (chunk_id, text_content) tuples.

        Returns:
            List of batches, each containing at most `batch_size` chunks.
        """
        if not chunks:
            return []

        # 1. Pre-validate every chunk text
        for idx, (chunk_id, content) in enumerate(chunks):
            if not content or not content.strip():
                raise EmbeddingError(
                    error_code="EMPTY_CHUNK_CONTENT",
                    message=f"Chunk {chunk_id} at index {idx} has empty or whitespace-only content",
                    is_retryable=False,
                )
            self.token_estimator.validate_text(content, chunk_index=idx)

        # 2. Slice into batches preserving order
        batches: List[List[Tuple[str, str]]] = []
        for i in range(0, len(chunks), self.batch_size):
            batches.append(chunks[i : i + self.batch_size])

        return batches
