"""Base interfaces and data structures for document text extractors."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class ExtractedPage:
    """Represents text extracted from a distinct physical or logical page."""
    page_number: int  # 1-based index
    text: str
    char_start: int
    char_end: int


@dataclass
class ExtractedSection:
    """Represents a titled section in a document (e.g. DOCX/Markdown heading)."""
    title: str
    level: int
    char_start: int
    char_end: int


@dataclass
class ExtractedDocument:
    """Structured output returned by an extractor implementation."""
    full_text: str
    page_count: Optional[int]
    pages: List[ExtractedPage] = field(default_factory=list)
    sections: List[ExtractedSection] = field(default_factory=list)
    extraction_method: str = "generic"
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseExtractor(ABC):
    """Abstract base class that all format-specific extractors must implement."""

    @abstractmethod
    def extract(self, file_bytes: bytes, filename: str) -> ExtractedDocument:
        """Extracts text content and structural boundaries from raw document bytes."""
        pass
