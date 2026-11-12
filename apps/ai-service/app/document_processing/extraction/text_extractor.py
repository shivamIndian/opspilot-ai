"""Plain text (.txt) document extraction."""

from app.config.settings import settings
from app.document_processing.extraction.base import BaseExtractor, ExtractedDocument
from app.document_processing.extraction.normalizer import TextNormalizer
from app.document_processing.exceptions import (
    CorruptedDocumentError,
    NoExtractableTextError,
    DocumentTooLargeError,
)


class TextExtractor(BaseExtractor):
    """Extracts and normalizes raw text from plain text files."""

    def extract(self, file_bytes: bytes, filename: str) -> ExtractedDocument:
        # 1. Safely decode UTF-8 with strict error handling
        try:
            raw_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError as e:
            raise CorruptedDocumentError(
                f"File is not valid UTF-8 text encoding: {str(e)}"
            )

        # 2. Reject binary null bytes
        if "\x00" in raw_text:
            raise CorruptedDocumentError(
                "Plain text file contains illegal binary null bytes"
            )

        # 3. Normalize text
        normalized_text = TextNormalizer.normalize(raw_text)

        if TextNormalizer.is_empty_or_whitespace(normalized_text):
            raise NoExtractableTextError("Plain text document contains no printable text")

        if len(normalized_text) > settings.MAX_EXTRACTED_CHARS:
            raise DocumentTooLargeError(
                f"Extracted character count ({len(normalized_text)}) exceeds limit of {settings.MAX_EXTRACTED_CHARS}"
            )

        return ExtractedDocument(
            full_text=normalized_text,
            page_count=None,
            pages=[],
            sections=[],
            extraction_method="utf8-text",
            metadata={
                "format": "txt",
                "char_length": len(normalized_text),
                "line_count": len(normalized_text.splitlines()),
            },
        )
