"""Factory for obtaining configured embedding provider instances."""

from typing import Optional, Dict
from app.config.settings import settings
from app.embeddings.base import EmbeddingProvider
from app.embeddings.providers.openai_provider import OpenAIEmbeddingProvider
from app.embeddings.providers.mock_provider import MockEmbeddingProvider
from app.embeddings.exceptions import EmbeddingError

_provider_cache: Dict[str, EmbeddingProvider] = {}


def get_embedding_provider(
    provider_name: Optional[str] = None,
    model: Optional[str] = None,
    dimensions: Optional[int] = None,
    api_key: Optional[str] = None,
) -> EmbeddingProvider:
    """Retrieves or creates a cached embedding provider instance."""
    if settings.EMBEDDING_PROVIDER.lower().strip() == "mock":
        name = "mock"
    else:
        name = (provider_name or settings.EMBEDDING_PROVIDER).lower().strip()
    model_name = (model or settings.EMBEDDING_MODEL).strip()
    dims = dimensions or settings.EMBEDDING_DIMENSIONS

    cache_key = f"{name}:{model_name}:{dims}"
    if cache_key in _provider_cache:
        return _provider_cache[cache_key]

    if name == "openai":
        key = api_key or settings.OPENAI_API_KEY
        if (not key or key.startswith("replace_with")) and settings.APP_ENV == "development":
            provider = MockEmbeddingProvider(
                model=model_name,
                dimensions=dims,
            )
        else:
            provider = OpenAIEmbeddingProvider(
                api_key=key,
                model=model_name,
                dimensions=dims,
                timeout=settings.EMBEDDING_REQUEST_TIMEOUT,
                max_retries=settings.EMBEDDING_MAX_RETRIES,
            )
    elif name == "mock":
        provider = MockEmbeddingProvider(
            model=model_name,
            dimensions=dims,
        )
    else:
        raise EmbeddingError(
            error_code="UNSUPPORTED_EMBEDDING_PROVIDER",
            message=f"Unsupported embedding provider: {name}. Supported providers are 'openai' and 'mock'.",
            is_retryable=False,
        )

    _provider_cache[cache_key] = provider
    return provider


async def close_embedding_providers() -> None:
    """Closes all cached provider resources during application shutdown."""
    for provider in _provider_cache.values():
        await provider.close()
    _provider_cache.clear()
