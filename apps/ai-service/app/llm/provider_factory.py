"""Factory and lifecycle manager for LLM providers."""

import logging
from typing import Optional
from app.config.settings import settings
from app.llm.base import LLMProvider
from app.llm.providers.openai_provider import OpenAIProvider
from app.llm.providers.mock_provider import MockLLMProvider
from app.llm.exceptions import LLMConfigurationError

logger = logging.getLogger(__name__)

_PROVIDER_INSTANCE: Optional[LLMProvider] = None


def get_llm_provider(
    provider_name: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> LLMProvider:
    """Returns the singleton LLM provider instance based on application settings.

    Reuses underlying AsyncOpenAI client connection pool across invocations.
    """
    global _PROVIDER_INSTANCE

    selected_provider = (provider_name or settings.LLM_PROVIDER).lower().strip()
    selected_model = model or settings.LLM_MODEL
    selected_key = api_key if api_key is not None else settings.OPENAI_API_KEY

    # If instance already exists and no specific provider was requested, or matches
    if _PROVIDER_INSTANCE is not None:
        if provider_name is None or (
            _PROVIDER_INSTANCE.provider_name == selected_provider
            and _PROVIDER_INSTANCE.model == selected_model
        ):
            return _PROVIDER_INSTANCE

    logger.info(
        f"Initializing LLM provider: {selected_provider} with model: {selected_model}"
    )

    if selected_provider == "openai":
        if (not selected_key or selected_key.startswith("replace_with")) and settings.APP_ENV == "development":
            logger.warning(
                "[LLMProvider] OPENAI_API_KEY is not configured in development environment. "
                "Automatically falling back to MockLLMProvider for offline simulation."
            )
            _PROVIDER_INSTANCE = MockLLMProvider(
                model=selected_model,
                max_output_tokens=settings.LLM_MAX_OUTPUT_TOKENS,
                temperature=settings.LLM_TEMPERATURE,
                request_timeout=settings.LLM_REQUEST_TIMEOUT,
            )
        else:
            _PROVIDER_INSTANCE = OpenAIProvider(
                api_key=selected_key,
                model=selected_model,
                max_output_tokens=settings.LLM_MAX_OUTPUT_TOKENS,
                temperature=settings.LLM_TEMPERATURE,
                request_timeout=settings.LLM_REQUEST_TIMEOUT,
                max_retries=settings.LLM_MAX_RETRIES,
                base_url=settings.OPENAI_BASE_URL,
            )
    elif selected_provider == "mock":
        _PROVIDER_INSTANCE = MockLLMProvider(
            model=selected_model,
            max_output_tokens=settings.LLM_MAX_OUTPUT_TOKENS,
            temperature=settings.LLM_TEMPERATURE,
            request_timeout=settings.LLM_REQUEST_TIMEOUT,
        )
    else:
        raise LLMConfigurationError(
            f"Unsupported LLM provider '{selected_provider}'. Supported providers are: 'openai', 'mock'."
        )

    return _PROVIDER_INSTANCE


async def close_llm_provider() -> None:
    """Disposes the cached provider and releases network resources."""
    global _PROVIDER_INSTANCE
    if _PROVIDER_INSTANCE is not None:
        try:
            await _PROVIDER_INSTANCE.close()
        except Exception as e:
            logger.warning(f"Error while closing LLM provider: {e}")
        finally:
            _PROVIDER_INSTANCE = None


def set_llm_provider(provider: Optional[LLMProvider]) -> None:
    """Overrides the singleton provider (used primarily in test fixtures)."""
    global _PROVIDER_INSTANCE
    _PROVIDER_INSTANCE = provider
