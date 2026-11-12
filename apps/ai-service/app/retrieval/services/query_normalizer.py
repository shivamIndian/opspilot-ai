"""Query validation and safe normalization."""

import re
import unicodedata
from app.retrieval.exceptions import RetrievalQueryEmptyError, RetrievalQueryTooLongError

MAX_QUERY_LENGTH = 1000


class QueryNormalizer:
    """Safely validates and normalizes natural-language search queries."""

    # Control chars excluding standard whitespace (ord < 32 except \t, \n, \r)
    _CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]")
    _WHITESPACE_RE = re.compile(r"\s+")

    @classmethod
    def normalize(cls, query: str, max_length: int = MAX_QUERY_LENGTH) -> str:
        """Normalizes and validates query string.

        Args:
            query: Raw user query string.
            max_length: Maximum allowed characters.

        Returns:
            Clean normalized query string.

        Raises:
            RetrievalQueryEmptyError: If query is empty or whitespace.
            RetrievalQueryTooLongError: If query exceeds max_length.
        """
        if not query:
            raise RetrievalQueryEmptyError("Search query cannot be empty")

        # 1. Unicode NFC normalization
        normalized = unicodedata.normalize("NFC", query)

        # 2. Strip non-printable control characters
        normalized = cls._CONTROL_CHAR_RE.sub("", normalized)

        # 3. Collapse multiple whitespace characters into single space
        normalized = cls._WHITESPACE_RE.sub(" ", normalized).strip()

        if not normalized:
            raise RetrievalQueryEmptyError("Search query contains no searchable characters")

        if len(normalized) > max_length:
            raise RetrievalQueryTooLongError(length=len(normalized), max_length=max_length)

        return normalized
