# OpsPilot AI – Embedding Provider Abstraction

## 1. Abstract Interface

All embedding models and external services implement the `EmbeddingProvider` abstract base class defined in `app/embeddings/base.py`:

```python
class EmbeddingProvider(ABC):
    def __init__(self, model: str, dimensions: int):
        self.model = model
        self.dimensions = dimensions

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Normalized lowercase provider name (e.g. 'openai', 'mock')."""
        pass

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generates embedding vectors for a list of document chunk texts."""
        pass

    @abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        """Generates an embedding vector for a search query string."""
        pass
```

## 2. OpenAI Embedding Provider

The production provider uses the official `openai.AsyncOpenAI` SDK:

- **Default Model**: `text-embedding-3-small`
- **Default Dimensions**: `1536`
- **Maximum Input Tokens**: `8191` (validated via `tiktoken`)
- **Ordering Guarantee**: Response vector ordering is explicitly validated against input indices.
- **Error Mapping**:
  - `AuthenticationError` -> `EMBEDDING_AUTHENTICATION_FAILED` (Terminal, 422)
  - `RateLimitError` -> `EMBEDDING_RATE_LIMITED` (Retryable, 500)
  - `APITimeoutError` -> `EMBEDDING_TIMEOUT` (Retryable, 500)
  - `APIConnectionError` -> `EMBEDDING_PROVIDER_UNAVAILABLE` (Retryable, 500)
  - Dimension mismatch / NaN / Inf -> `EMBEDDING_DIMENSION_MISMATCH` / `EMBEDDING_INVALID_RESPONSE` (Terminal, 422)

## 3. Mock Embedding Provider

The deterministic offline mock provider (`MockEmbeddingProvider`):

- Operates entirely offline without external network or API keys.
- Derives a deterministic pseudo-random seed from the SHA-256 hash of the input text.
- Generates reproducible, unit-normalized (L2 norm ≈ 1.0) 1536-dimensional float vectors.
- Enables lightning-fast, zero-cost CI test execution and local sandbox development.

## 4. Provider Factory & Lifecycle Management

`EmbeddingProviderFactory` provides cached singleton instances per `(provider, model, dimensions)` tuple:

- Dynamically selects provider via the `EMBEDDING_PROVIDER` environment variable.
- Safely closes HTTP client sessions on FastAPI shutdown hook via `close_embedding_providers()`.
