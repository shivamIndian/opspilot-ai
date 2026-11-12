"""Reusable text normalization pipeline for extracted document text."""

import re
import unicodedata
from typing import Tuple


class TextNormalizer:
    """Normalizes extracted text while preserving document structure and readability."""

    # Matches control characters other than \t (0x09) and \n (0x0A)
    CONTROL_CHAR_REGEX = re.compile(r"[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]")

    # Matches 3 or more consecutive newlines
    EXCESSIVE_NEWLINES_REGEX = re.compile(r"\n{3,}")

    # Matches trailing horizontal whitespace on lines
    TRAILING_WHITESPACE_REGEX = re.compile(r"[ \t]+$", re.MULTILINE)

    @classmethod
    def normalize(cls, raw_text: str) -> str:
        """Applies canonical Unicode, line-ending, and whitespace normalization."""
        if not raw_text:
            return ""

        # 1. Unicode normalization (NFC)
        normalized = unicodedata.normalize("NFC", raw_text)

        # 2. Line ending normalization (CRLF and CR to LF)
        normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")

        # 3. Strip null bytes and non-printable control characters
        normalized = cls.CONTROL_CHAR_REGEX.sub("", normalized)

        # 4. Strip trailing whitespace from individual lines
        normalized = cls.TRAILING_WHITESPACE_REGEX.sub("", normalized)

        # 5. Collapse excessive blank lines (more than 2 consecutive newlines)
        normalized = cls.EXCESSIVE_NEWLINES_REGEX.sub("\n\n", normalized)

        return normalized.strip()

    @classmethod
    def is_empty_or_whitespace(cls, text: str) -> bool:
        """Determines if text has no meaningful alphanumeric or printable characters."""
        if not text:
            return True
        return len(text.strip()) == 0
