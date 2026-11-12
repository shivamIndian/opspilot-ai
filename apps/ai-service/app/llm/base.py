"""Abstract base class and contract for all LLM providers."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Type, TypeVar, Tuple, Optional
from pydantic import BaseModel
from app.llm.schemas import LLMUsage

T = TypeVar("T", bound=BaseModel)


class LLMProvider(ABC):
    """Abstract interface for LLM text and structured output generation."""

    def __init__(
        self,
        model: str,
        max_output_tokens: int = 1500,
        temperature: float = 0.2,
        request_timeout: float = 60.0,
        max_retries: int = 3,
    ):
        self.model = model
        self.max_output_tokens = max_output_tokens
        self.temperature = temperature
        self.request_timeout = request_timeout
        self.max_retries = max_retries

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Canonical name of the provider (e.g. 'openai', 'mock')."""
        pass

    @abstractmethod
    async def generate(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> Tuple[str, LLMUsage]:
        """Generates raw text completion from an array of chat messages.

        Returns:
            Tuple of (generated_text, usage_metrics)
        """
        pass

    @abstractmethod
    async def generate_structured(
        self,
        messages: List[Dict[str, str]],
        response_schema: Type[T],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> Tuple[T, LLMUsage]:
        """Generates structured output strictly adhering to a Pydantic schema.

        Returns:
            Tuple of (validated_pydantic_instance, usage_metrics)
        """
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Verifies connectivity, authentication, and readiness of the provider."""
        pass

    async def close(self) -> None:
        """Lifecycle cleanup hook to safely dispose HTTP clients and network pools."""
        pass
