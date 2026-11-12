"""Exceptions for RAG retrieval subsystem."""

from typing import Optional, Dict, Any


class RetrievalError(Exception):
    """Base exception for retrieval errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "RETRIEVAL_ERROR",
        is_retryable: bool = False,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.is_retryable = is_retryable
        self.details = details or {}


class RetrievalQueryEmptyError(RetrievalError):
    def __init__(self, message: str = "Search query cannot be empty or whitespace"):
        super().__init__(
            message=message,
            error_code="RETRIEVAL_QUERY_EMPTY",
            is_retryable=False,
        )


class RetrievalQueryTooLongError(RetrievalError):
    def __init__(self, length: int, max_length: int = 1000):
        super().__init__(
            message=f"Query length of {length} characters exceeds maximum limit of {max_length}",
            error_code="RETRIEVAL_QUERY_TOO_LONG",
            is_retryable=False,
            details={"length": length, "max_length": max_length},
        )


class RetrievalDimensionMismatchError(RetrievalError):
    def __init__(self, expected: int, actual: int):
        super().__init__(
            message=f"Query vector dimensions {actual} do not match embedding space dimensions {expected}",
            error_code="RETRIEVAL_DIMENSION_MISMATCH",
            is_retryable=False,
            details={"expected": expected, "actual": actual},
        )


class RetrievalInvalidModeError(RetrievalError):
    def __init__(self, mode: str):
        super().__init__(
            message=f"Invalid retrieval mode '{mode}'. Supported modes: hybrid, semantic, keyword",
            error_code="RETRIEVAL_INVALID_MODE",
            is_retryable=False,
            details={"mode": mode},
        )


class RetrievalTimeoutError(RetrievalError):
    def __init__(self, operation: str, timeout_seconds: float):
        super().__init__(
            message=f"Retrieval operation '{operation}' timed out after {timeout_seconds}s",
            error_code="RETRIEVAL_TIMEOUT",
            is_retryable=True,
            details={"operation": operation, "timeout_seconds": timeout_seconds},
        )


class RetrievalProviderError(RetrievalError):
    def __init__(self, message: str, is_retryable: bool = True):
        super().__init__(
            message=message,
            error_code="RETRIEVAL_PROVIDER_ERROR",
            is_retryable=is_retryable,
        )
