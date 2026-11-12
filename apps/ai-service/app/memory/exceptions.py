"""Custom exceptions for agent memory operations."""

from typing import Optional, List


class MemoryError(Exception):
    """Base exception for all agent memory operations."""

    def __init__(self, message: str, code: str = "MEMORY_ERROR", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class MemoryNotFoundError(MemoryError):
    """Raised when a requested memory item or setting is not found."""

    def __init__(self, message: str = "Memory item not found"):
        super().__init__(message=message, code="MEMORY_NOT_FOUND", status_code=404)


class MemoryAccessDeniedError(MemoryError):
    """Raised when a user attempts to access or mutate a memory belonging to another user."""

    def __init__(self, message: str = "Access denied to memory record"):
        super().__init__(message=message, code="MEMORY_ACCESS_DENIED", status_code=403)


class MemoryScreeningError(MemoryError):
    """Raised when proposed memory content contains sensitive credentials, PII, or prompt injections."""

    def __init__(self, message: str, violations: Optional[List[str]] = None):
        super().__init__(message=message, code="MEMORY_SCREENING_REJECTED", status_code=422)
        self.violations = violations or []


class MemoryDuplicateError(MemoryError):
    """Raised when an active identical memory already exists for the user."""

    def __init__(self, message: str = "An identical active memory record already exists"):
        super().__init__(message=message, code="MEMORY_DUPLICATE", status_code=409)


class MemoryConsentRequiredError(MemoryError):
    """Raised when long-term memory operations are attempted while user consent is disabled."""

    def __init__(self, message: str = "Agent memory is disabled for this user"):
        super().__init__(message=message, code="MEMORY_CONSENT_REQUIRED", status_code=403)


class MemoryExtractionError(MemoryError):
    """Raised when candidate memory extraction fails during LLM parsing."""

    def __init__(self, message: str = "Failed to extract candidate memories from conversation"):
        super().__init__(message=message, code="MEMORY_EXTRACTION_FAILED", status_code=500)
