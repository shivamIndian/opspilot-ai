"""Markdown (.md) document extraction and heading hierarchy detection."""

import re
from typing import List
from app.config.settings import settings
from app.document_processing.extraction.base import (
    BaseExtractor,
    ExtractedDocument,
    ExtractedSection,
)
from app.document_processing.extraction.normalizer import TextNormalizer
from app.document_processing.exceptions import (
    CorruptedDocumentError,
    NoExtractableTextError,
    DocumentTooLargeError,
)

HEADING_REGEX = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)


class MarkdownExtractor(BaseExtractor):
    """Extracts Markdown content while discovering structural section headings."""

    def extract(self, file_bytes: bytes, filename: str) -> ExtractedDocument:
        # 1. Safely decode UTF-8 with strict error handling
        try:
            raw_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError as e:
            raise CorruptedDocumentError(
                f"File is not valid UTF-8 markdown encoding: {str(e)}"
            )

        # 2. Reject binary null bytes
        if "\x00" in raw_text:
            raise CorruptedDocumentError(
                "Markdown file contains illegal binary null bytes"
            )

        # 3. Normalize text content
        normalized_text = TextNormalizer.normalize(raw_text)

        if TextNormalizer.is_empty_or_whitespace(normalized_text):
            raise NoExtractableTextError("Markdown document contains no printable text")

        if len(normalized_text) > settings.MAX_EXTRACTED_CHARS:
            raise DocumentTooLargeError(
                f"Extracted character count ({len(normalized_text)}) exceeds limit of {settings.MAX_EXTRACTED_CHARS}"
            )

        # 4. Discover Markdown heading sections
        sections: List[ExtractedSection] = []
        for match in HEADING_REGEX.finditer(normalized_text):
            hashes, title = match.groups()
            sections.append(
                ExtractedSection(
                    title=title.strip(),
                    level=len(hashes),
                    char_start=match.start(),
                    char_end=match.end(),
                )
            )

        return ExtractedDocument(
            full_text=normalized_text,
            page_count=None,
            pages=[],
            sections=sections,
            extraction_method="markdown",
            metadata={
                "format": "md",
                "char_length": len(normalized_text),
                "heading_count": len(sections),
            },
        )
