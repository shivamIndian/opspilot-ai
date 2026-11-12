"""Mock embedding provider for unit tests and local sandbox evaluation."""

import hashlib
import math
from typing import List
from app.embeddings.base import EmbeddingProvider
from app.embeddings.services.embedding_validation_service import EmbeddingValidationService


class MockEmbeddingProvider(EmbeddingProvider):
    """Generates deterministic pseudo-random unit vectors for tests and offline development."""

    def __init__(self, model: str = "text-embedding-3-small", dimensions: int = 1536):
        super().__init__(model=model, dimensions=dimensions)

    @property
    def provider_name(self) -> str:
        return "mock"

    def _generate_vector(self, text: str) -> List[float]:
        """Generates a deterministic L2-normalized float vector based on SHA-256 seed."""
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16)
        raw_vals: List[float] = []

        # Simple linear congruential pseudo-random sequence from seed
        current = seed
        for _ in range(self.dimensions):
            current = (1103515245 * current + 12345) & 0x7FFFFFFF
            val = (current / 0x7FFFFFFF) * 2.0 - 1.0
            raw_vals.append(val)

        # L2-normalize
        norm = math.sqrt(sum(x * x for x in raw_vals)) or 1.0
        normalized = [round(x / norm, 6) for x in raw_vals]
        return normalized

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        vectors = [self._generate_vector(t) for t in texts]

        # Verify through standard validation service
        EmbeddingValidationService.validate_batch(
            vectors=vectors,
            expected_count=len(texts),
            expected_dimensions=self.dimensions,
        )
        return vectors

    async def embed_query(self, text: str) -> List[float]:
        return self._generate_vector(text)
