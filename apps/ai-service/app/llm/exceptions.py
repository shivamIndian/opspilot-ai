"""Standardized LLM exceptions and error codes for OpsPilot AI."""

from typing import Optional, Dict, Any


class LLMError(Exception):
    """Base exception for all LLM provider, prompt, and response generation errors."""

    def __init__(
        self,
        error_code: str,
        message: str,
        is_retryable: bool = False,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.error_code = error_code
        self.message = message
        self.is_retryable = is_retryable
        self.details = details or {}


class LLMProviderUnavailableError(LLMError):
    def __init__(
        self,
        message: str = "LLM provider service is temporarily unavailable",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_PROVIDER_UNAVAILABLE",
            message=message,
            is_retryable=True,
            details=details,
        )


class LLMAuthenticationFailedError(LLMError):
    def __init__(
        self,
        message: str = "LLM provider authentication failed or API key is invalid",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_AUTHENTICATION_FAILED",
            message=message,
            is_retryable=False,
            details=details,
        )


class LLMRateLimitedError(LLMError):
    def __init__(
        self,
        message: str = "LLM request was rate limited by the provider",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_RATE_LIMITED",
            message=message,
            is_retryable=True,
            details=details,
        )


class LLMQuotaExceededError(LLMError):
    def __init__(
        self,
        message: str = "LLM provider account quota permanently exceeded",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_QUOTA_EXCEEDED",
            message=message,
            is_retryable=False,
            details=details,
        )


class LLMTimeoutError(LLMError):
    def __init__(
        self,
        message: str = "LLM generation request timed out",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_TIMEOUT",
            message=message,
            is_retryable=True,
            details=details,
        )


class LLMContextTooLargeError(LLMError):
    def __init__(
        self,
        message: str = "Retrieved context exceeds configured model token limits",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_CONTEXT_TOO_LARGE",
            message=message,
            is_retryable=False,
            details=details,
        )


class LLMOutputTruncatedError(LLMError):
    def __init__(
        self,
        message: str = "Model generation truncated before reaching completion",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_OUTPUT_TRUNCATED",
            message=message,
            is_retryable=False,
            details=details,
        )


class LLMInvalidResponseError(LLMError):
    def __init__(
        self,
        message: str = "LLM returned an empty or unparseable response payload",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_INVALID_RESPONSE",
            message=message,
            is_retryable=False,
            details=details,
        )


class LLMStructuredOutputFailedError(LLMError):
    def __init__(
        self,
        message: str = "LLM response failed Pydantic schema validation",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_STRUCTURED_OUTPUT_FAILED",
            message=message,
            is_retryable=False,
            details=details,
        )


class LLMCitationValidationFailedError(LLMError):
    def __init__(
        self,
        message: str = "LLM response cited non-existent or invalid source identifiers",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_CITATION_VALIDATION_FAILED",
            message=message,
            is_retryable=False,
            details=details,
        )


class LLMConfigurationError(LLMError):
    def __init__(
        self,
        message: str = "LLM provider or model configuration is invalid or missing",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_CONFIGURATION_ERROR",
            message=message,
            is_retryable=False,
            details=details,
        )


class LLMContentFilteredError(LLMError):
    def __init__(
        self,
        message: str = "LLM generation was flagged or rejected by provider safety filters",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            error_code="LLM_CONTENT_FILTERED",
            message=message,
            is_retryable=False,
            details=details,
        )
