"""Standardized embedding exceptions and error codes."""

from typing import Optional, Dict, Any


class EmbeddingError(Exception):
    """Base exception for all embedding generation and persistence errors."""

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


class EmbeddingProviderUnavailableError(EmbeddingError):
    def __init__(self, message: str = "Embedding provider service is unavailable"):
        super().__init__(
            error_code="EMBEDDING_PROVIDER_UNAVAILABLE",
            message=message,
            is_retryable=True,
        )


class EmbeddingAuthenticationFailedError(EmbeddingError):
    def __init__(self, message: str = "Embedding provider authentication failed"):
        super().__init__(
            error_code="EMBEDDING_AUTHENTICATION_FAILED",
            message=message,
            is_retryable=False,
        )


class EmbeddingRateLimitedError(EmbeddingError):
    def __init__(self, message: str = "Embedding request rate limited by provider"):
        super().__init__(
            error_code="EMBEDDING_RATE_LIMITED",
            message=message,
            is_retryable=True,
        )


class EmbeddingQuotaExceededError(EmbeddingError):
    def __init__(self, message: str = "Embedding provider quota permanently exhausted"):
        super().__init__(
            error_code="EMBEDDING_QUOTA_EXCEEDED",
            message=message,
            is_retryable=False,
        )


class EmbeddingTimeoutError(EmbeddingError):
    def __init__(self, message: str = "Embedding generation request timed out"):
        super().__init__(
            error_code="EMBEDDING_TIMEOUT",
            message=message,
            is_retryable=True,
        )


class EmbeddingInputTooLargeError(EmbeddingError):
    def __init__(self, message: str = "Chunk input exceeds model maximum token limit"):
        super().__init__(
            error_code="EMBEDDING_INPUT_TOO_LARGE",
            message=message,
            is_retryable=False,
        )


class EmbeddingDimensionMismatchError(EmbeddingError):
    def __init__(self, message: str = "Returned embedding dimensions do not match schema configuration"):
        super().__init__(
            error_code="EMBEDDING_DIMENSION_MISMATCH",
            message=message,
            is_retryable=False,
        )


class EmbeddingInvalidResponseError(EmbeddingError):
    def __init__(self, message: str = "Embedding provider returned malformed or non-finite vector data"):
        super().__init__(
            error_code="EMBEDDING_INVALID_RESPONSE",
            message=message,
            is_retryable=False,
        )


class EmbeddingStorageError(EmbeddingError):
    def __init__(self, message: str = "Failed to persist vector embeddings to pgvector database"):
        super().__init__(
            error_code="EMBEDDING_STORAGE_FAILED",
            message=message,
            is_retryable=True,
        )


class DocumentChunksNotFoundError(EmbeddingError):
    def __init__(self, message: str = "No document chunks found for the requested processing generation"):
        super().__init__(
            error_code="DOCUMENT_CHUNKS_NOT_FOUND",
            message=message,
            is_retryable=False,
        )


class ProcessingGenerationMismatchError(EmbeddingError):
    def __init__(self, message: str = "Requested processing generation does not match active document state"):
        super().__init__(
            error_code="PROCESSING_GENERATION_MISMATCH",
            message=message,
            is_retryable=False,
        )


class EmbeddingGenerationConflictError(EmbeddingError):
    def __init__(self, message: str = "Concurrent embedding generation conflict detected"):
        super().__init__(
            error_code="EMBEDDING_GENERATION_CONFLICT",
            message=message,
            is_retryable=False,
        )
