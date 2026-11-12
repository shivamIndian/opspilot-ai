"""Official OpenAI async LLM provider implementation."""

import json
from typing import List, Dict, Any, Type, TypeVar, Tuple, Optional
from pydantic import BaseModel, ValidationError

import openai
from openai import AsyncOpenAI
from app.llm.base import LLMProvider
from app.llm.schemas import LLMUsage
from app.llm.exceptions import (
    LLMProviderUnavailableError,
    LLMAuthenticationFailedError,
    LLMRateLimitedError,
    LLMQuotaExceededError,
    LLMTimeoutError,
    LLMContextTooLargeError,
    LLMOutputTruncatedError,
    LLMInvalidResponseError,
    LLMStructuredOutputFailedError,
    LLMConfigurationError,
    LLMContentFilteredError,
)

T = TypeVar("T", bound=BaseModel)


class OpenAIProvider(LLMProvider):
    """Production OpenAI provider utilizing official AsyncOpenAI client."""

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        max_output_tokens: int = 1500,
        temperature: float = 0.2,
        request_timeout: float = 60.0,
        max_retries: int = 3,
        base_url: Optional[str] = None,
    ):
        super().__init__(
            model=model,
            max_output_tokens=max_output_tokens,
            temperature=temperature,
            request_timeout=request_timeout,
            max_retries=max_retries,
        )

        cleaned_key = api_key.strip() if api_key else ""
        if not cleaned_key or cleaned_key.startswith("replace_with"):
            raise LLMAuthenticationFailedError(
                "OpenAI API key is missing or not configured. Set OPENAI_API_KEY in environment."
            )

        self._client: AsyncOpenAI = AsyncOpenAI(
            api_key=cleaned_key,
            timeout=request_timeout,
            max_retries=max_retries,
            base_url=base_url,
        )

    @property
    def provider_name(self) -> str:
        return "openai"

    def _translate_error(self, err: Exception) -> Exception:
        """Translates OpenAI SDK exceptions into standardized OpsPilot LLM errors."""
        if isinstance(err, openai.AuthenticationError):
            return LLMAuthenticationFailedError(
                message=f"OpenAI authentication failed: {str(err)}",
                details={"status_code": getattr(err, "status_code", 401)},
            )
        elif isinstance(err, openai.RateLimitError):
            err_msg = str(err).lower()
            if "quota" in err_msg or "billing" in err_msg:
                return LLMQuotaExceededError(
                    message=f"OpenAI quota or billing limit exceeded: {str(err)}",
                    details={"status_code": getattr(err, "status_code", 429)},
                )
            return LLMRateLimitedError(
                message=f"OpenAI rate limit exceeded: {str(err)}",
                details={"status_code": getattr(err, "status_code", 429)},
            )
        elif isinstance(err, openai.APITimeoutError):
            return LLMTimeoutError(
                message=f"OpenAI request timed out after {self.request_timeout}s: {str(err)}"
            )
        elif isinstance(err, openai.APIConnectionError):
            return LLMProviderUnavailableError(
                message=f"Could not connect to OpenAI API endpoint: {str(err)}"
            )
        elif isinstance(err, openai.InternalServerError):
            return LLMProviderUnavailableError(
                message=f"OpenAI returned a temporary internal server error: {str(err)}",
                details={"status_code": getattr(err, "status_code", 500)},
            )
        elif isinstance(err, openai.BadRequestError):
            err_str = str(err).lower()
            if "maximum context length" in err_str or "context_length_exceeded" in err_str:
                return LLMContextTooLargeError(
                    message=f"Context tokens exceeded model window: {str(err)}",
                    details={"model": self.model},
                )
            return LLMInvalidResponseError(
                message=f"Invalid request rejected by OpenAI: {str(err)}"
            )
        return err

    def _extract_usage(self, response: Any) -> LLMUsage:
        """Extracts token usage metrics safely from provider response."""
        usage_data = getattr(response, "usage", None)
        if not usage_data:
            return LLMUsage()
        return LLMUsage(
            input_tokens=getattr(usage_data, "prompt_tokens", None),
            output_tokens=getattr(usage_data, "completion_tokens", None),
            total_tokens=getattr(usage_data, "total_tokens", None),
        )

    async def generate(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> Tuple[str, LLMUsage]:
        """Generates raw text response."""
        tokens = max_tokens or self.max_output_tokens
        temp = temperature if temperature is not None else self.temperature

        try:
            response = await self._client.chat.completions.create(
                model=self.model,
                messages=messages,  # type: ignore[arg-type]
                max_tokens=tokens,
                temperature=temp,
            )

            choice = response.choices[0]
            if choice.finish_reason == "content_filter":
                raise LLMContentFilteredError("Response flagged by content safety filters.")
            if choice.finish_reason == "length":
                raise LLMOutputTruncatedError(
                    "Model output reached maximum token limit before completion."
                )

            content = choice.message.content or ""
            return content, self._extract_usage(response)

        except Exception as err:
            raise self._translate_error(err)

    async def generate_structured(
        self,
        messages: List[Dict[str, str]],
        response_schema: Type[T],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> Tuple[T, LLMUsage]:
        """Generates schema-validated structured output using OpenAI Parse API."""
        tokens = max_tokens or self.max_output_tokens
        temp = temperature if temperature is not None else self.temperature

        try:
            response = await self._client.beta.chat.completions.parse(
                model=self.model,
                messages=messages,  # type: ignore[arg-type]
                response_format=response_schema,
                max_tokens=tokens,
                temperature=temp,
            )

            choice = response.choices[0]
            if choice.finish_reason == "content_filter":
                raise LLMContentFilteredError("Response flagged by content safety filters.")
            if choice.finish_reason == "length":
                raise LLMOutputTruncatedError(
                    "Model output reached maximum token limit before completing structured output."
                )

            message = choice.message
            refusal = getattr(message, "refusal", None)
            if refusal:
                raise LLMContentFilteredError(f"Model refused generation: {refusal}")

            parsed = getattr(message, "parsed", None)
            if parsed is not None:
                return parsed, self._extract_usage(response)

            # Fallback if parsed is None but content contains JSON
            content = message.content or ""
            if not content:
                raise LLMInvalidResponseError("OpenAI returned an empty message content.")

            try:
                validated = response_schema.model_validate_json(content)
                return validated, self._extract_usage(response)
            except ValidationError as val_err:
                raise LLMStructuredOutputFailedError(
                    message=f"Model output failed schema validation: {str(val_err)}",
                    details={"raw_content": content[:500]},
                )

        except Exception as err:
            if isinstance(err, (LLMContentFilteredError, LLMOutputTruncatedError, LLMStructuredOutputFailedError)):
                raise
            raise self._translate_error(err)

    async def health_check(self) -> bool:
        """Verifies OpenAI API accessibility by making a lightweight model list query."""
        try:
            # Check model availability
            await self._client.models.retrieve(self.model)
            return True
        except Exception as err:
            raise self._translate_error(err)

    async def close(self) -> None:
        """Closes the underlying AsyncOpenAI HTTP client."""
        await self._client.close()
