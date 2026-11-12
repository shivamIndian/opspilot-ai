"""Document processing exceptions and standardized error codes."""

from typing import Optional


class DocumentProcessingError(Exception):
    """Base exception for all document processing errors."""

    def __init__(
        self,
        error_code: str,
        message: str,
        is_retryable: bool = False,
        details: Optional[dict] = None,
    ):
        super().__init__(message)
        self.error_code = error_code
        self.message = message
        self.is_retryable = is_retryable
        self.details = details or {}


class UnsupportedFileTypeError(DocumentProcessingError):
    def __init__(self, message: str = "Unsupported file type for extraction"):
        super().__init__(
            error_code="UNSUPPORTED_FILE_TYPE",
            message=message,
            is_retryable=False,
        )


class InvalidFileSignatureError(DocumentProcessingError):
    def __init__(self, message: str = "File signature does not match declared type"):
        super().__init__(
            error_code="INVALID_FILE_SIGNATURE",
            message=message,
            is_retryable=False,
        )


class CorruptedDocumentError(DocumentProcessingError):
    def __init__(self, message: str = "Document content is malformed or corrupted"):
        super().__init__(
            error_code="CORRUPTED_DOCUMENT",
            message=message,
            is_retryable=False,
        )


class EncryptedPdfUnsupportedError(DocumentProcessingError):
    def __init__(self, message: str = "Password-protected or encrypted PDFs are unsupported"):
        super().__init__(
            error_code="ENCRYPTED_PDF_UNSUPPORTED",
            message=message,
            is_retryable=False,
        )


class NoExtractableTextError(DocumentProcessingError):
    def __init__(self, message: str = "No extractable text content found in document"):
        super().__init__(
            error_code="NO_EXTRACTABLE_TEXT",
            message=message,
            is_retryable=False,
        )


class DocumentTooLargeError(DocumentProcessingError):
    def __init__(self, message: str = "Document size exceeds allowable processing limit"):
        super().__init__(
            error_code="DOCUMENT_TOO_LARGE",
            message=message,
            is_retryable=False,
        )


class DocumentPageLimitExceededError(DocumentProcessingError):
    def __init__(self, message: str = "Document exceeds allowable maximum page limit"):
        super().__init__(
            error_code="DOCUMENT_PAGE_LIMIT_EXCEEDED",
            message=message,
            is_retryable=False,
        )


class ChunkLimitExceededError(DocumentProcessingError):
    def __init__(self, message: str = "Document generated too many chunks exceeding safety limit"):
        super().__init__(
            error_code="CHUNK_LIMIT_EXCEEDED",
            message=message,
            is_retryable=False,
        )


class InternalProcessingError(DocumentProcessingError):
    def __init__(self, message: str = "Internal server error occurred during processing"):
        super().__init__(
            error_code="INTERNAL_PROCESSING_ERROR",
            message=message,
            is_retryable=True,
        )
