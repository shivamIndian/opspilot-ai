"""Abstract base class for all embedding providers."""

from abc import ABC, abstractmethod
from typing import List


def format_embedding_space(provider: str, model: str, dimensions: int) -> str:
    """Canonical embedding space identifier ensuring vector space separation."""
    return f"{provider.lower().strip()}:{model.lower().strip()}:{dimensions}"


class EmbeddingProvider(ABC):
    """Abstract interface for generating vector embeddings."""

    def __init__(self, model: str, dimensions: int):
        self.model = model
        self.dimensions = dimensions

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the embedding provider (e.g., 'openai', 'mock')."""
        pass

    @property
    def embedding_space(self) -> str:
        """Canonical embedding space identity (provider:model:dimensions)."""
        return format_embedding_space(self.provider_name, self.model, self.dimensions)

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Asynchronously generates vector embeddings for a list of document chunk texts.

        Args:
            texts: List of normalized document texts to embed.

        Returns:
            List of float vector lists, matching 1:1 with input text indices.
        """
        pass

    @abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        """Asynchronously generates a single vector embedding for a query text."""
        pass

    async def close(self) -> None:
        """Lifecycle hook to clean up HTTP clients and resources."""
        pass
