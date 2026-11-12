"""OpenAI embedding provider implementation using the official async Python SDK."""

from typing import List, Optional
import httpx
from openai import (
    AsyncOpenAI,
    AuthenticationError,
    RateLimitError,
    APITimeoutError,
    APIConnectionError,
    BadRequestError,
    APIError,
)
from app.embeddings.base import EmbeddingProvider
from app.embeddings.exceptions import (
    EmbeddingAuthenticationFailedError,
    EmbeddingRateLimitedError,
    EmbeddingTimeoutError,
    EmbeddingProviderUnavailableError,
    EmbeddingQuotaExceededError,
    EmbeddingError,
)
from app.embeddings.services.embedding_validation_service import EmbeddingValidationService


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """Generates embeddings using OpenAI's asynchronous API."""

    def __init__(
        self,
        api_key: str,
        model: str = "text-embedding-3-small",
        dimensions: int = 1536,
        timeout: float = 60.0,
        max_retries: int = 2,
    ):
        super().__init__(model=model, dimensions=dimensions)
        if not api_key or not api_key.strip():
            raise EmbeddingAuthenticationFailedError("OpenAI API key is missing or empty")

        self.timeout = timeout
        self.max_retries = max_retries
        self._client: Optional[AsyncOpenAI] = AsyncOpenAI(
            api_key=api_key.strip(),
            timeout=httpx.Timeout(timeout, connect=10.0),
            max_retries=max_retries,
        )

    @property
    def provider_name(self) -> str:
        return "openai"

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generates embeddings for a batch of document chunk strings."""
        if not texts:
            return []

        if not self._client:
            raise EmbeddingProviderUnavailableError("OpenAI client has been closed or uninitialized")

        try:
            # Model text-embedding-3-small and text-embedding-3-large support explicit dimensions
            kwargs = {
                "input": texts,
                "model": self.model,
            }
            if "text-embedding-3" in self.model:
                kwargs["dimensions"] = self.dimensions

            response = await self._client.embeddings.create(**kwargs)

            # Sort by index to guarantee input ordering preservation
            sorted_items = sorted(response.data, key=lambda item: item.index)
            vectors: List[List[float]] = [item.embedding for item in sorted_items]

            # Validate integrity, dimensions, and finite numbers
            EmbeddingValidationService.validate_batch(
                vectors=vectors,
                expected_count=len(texts),
                expected_dimensions=self.dimensions,
            )

            return vectors

        except AuthenticationError as e:
            raise EmbeddingAuthenticationFailedError(f"OpenAI authentication failed: {e.message}") from e

        except RateLimitError as e:
            msg = str(e.message)
            if "quota" in msg.lower() or "billing" in msg.lower():
                raise EmbeddingQuotaExceededError(f"OpenAI quota exhausted: {msg}") from e
            raise EmbeddingRateLimitedError(f"OpenAI rate limit exceeded: {msg}") from e

        except APITimeoutError as e:
            raise EmbeddingTimeoutError("OpenAI embedding request timed out") from e

        except APIConnectionError as e:
            raise EmbeddingProviderUnavailableError("OpenAI network connection failure") from e

        except BadRequestError as e:
            msg = str(e.message)
            if "maximum context length" in msg or "tokens" in msg:
                from app.embeddings.exceptions import EmbeddingInputTooLargeError
                raise EmbeddingInputTooLargeError(f"OpenAI input token limit exceeded: {msg}") from e
            raise EmbeddingError("EMBEDDING_INVALID_REQUEST", f"OpenAI bad request: {msg}", is_retryable=False) from e

        except APIError as e:
            raise EmbeddingProviderUnavailableError(f"OpenAI server returned error code {e.code}: {e.message}") from e

    async def embed_query(self, text: str) -> List[float]:
        """Generates embedding for a single search or evaluation query."""
        results = await self.embed_documents([text])
        return results[0]

    async def close(self) -> None:
        """Closes the underlying httpx async client."""
        if self._client:
            await self._client.close()
            self._client = None
