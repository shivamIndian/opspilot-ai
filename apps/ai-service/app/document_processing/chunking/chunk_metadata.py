"""Chunk metadata dataclass."""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any


@dataclass
class RawChunk:
    """Represents an extracted chunk of text with structural and positional metadata."""
    chunk_index: int
    content: str
    content_hash: str
    char_start: int
    char_end: int
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    section_title: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
