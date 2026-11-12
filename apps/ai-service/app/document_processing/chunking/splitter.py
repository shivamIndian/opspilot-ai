"""Deterministic hierarchical document text chunking engine."""

import hashlib
from typing import List, Optional
from app.config.settings import settings
from app.document_processing.chunking.chunk_metadata import RawChunk
from app.document_processing.extraction.base import ExtractedDocument
from app.document_processing.exceptions import ChunkLimitExceededError


class DocumentSplitter:
    """Splits normalized text into deterministic chunks with configurable overlap and metadata."""

    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
        max_chunks: Optional[int] = None,
    ):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        self.max_chunks = max_chunks or settings.MAX_CHUNKS_PER_DOCUMENT

        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap must be strictly less than chunk_size")

    def split_document(self, doc: ExtractedDocument) -> List[RawChunk]:
        """Performs hierarchical chunking across the extracted document text."""
        text = doc.full_text
        total_len = len(text)
        if total_len == 0:
            return []

        chunks: List[RawChunk] = []
        start_idx = 0
        chunk_index = 0

        while start_idx < total_len:
            if len(chunks) >= self.max_chunks:
                raise ChunkLimitExceededError(
                    f"Document generated {len(chunks)} chunks, exceeding safety limit of {self.max_chunks}"
                )

            # Determine upper boundary for candidate chunk
            target_end = min(start_idx + self.chunk_size, total_len)

            if target_end == total_len:
                actual_end = total_len
            else:
                # Find optimal hierarchical breaking point in the lookback window
                actual_end = self._find_break_point(text, start_idx, target_end)

            chunk_content = text[start_idx:actual_end].strip()

            if chunk_content:
                # Preserve exact character offsets of stripped content
                relative_offset = text[start_idx:actual_end].find(chunk_content)
                char_start = start_idx + (relative_offset if relative_offset != -1 else 0)
                char_end = char_start + len(chunk_content)

                # Compute content SHA-256
                content_hash = hashlib.sha256(chunk_content.encode("utf-8")).hexdigest()

                # Map page references if document has page boundaries
                page_start, page_end = self._resolve_pages(doc, char_start, char_end)

                # Map section title if document has structural headings
                section_title = self._resolve_section_title(doc, char_start)

                chunks.append(
                    RawChunk(
                        chunk_index=chunk_index,
                        content=chunk_content,
                        content_hash=content_hash,
                        char_start=char_start,
                        char_end=char_end,
                        page_start=page_start,
                        page_end=page_end,
                        section_title=section_title,
                        metadata={
                            "char_count": len(chunk_content),
                            "format": doc.metadata.get("format", "unknown"),
                            "pipeline_version": settings.PIPELINE_VERSION,
                        },
                    )
                )
                chunk_index += 1

            if actual_end >= total_len:
                break

            # Calculate next chunk start maintaining configured overlap
            next_start = actual_end - self.chunk_overlap
            if next_start <= start_idx:
                next_start = actual_end  # Ensure forward progress

            # Adjust next_start to not start mid-word if possible
            if next_start < actual_end and next_start > start_idx:
                next_start = self._adjust_overlap_start(text, next_start, actual_end)

            start_idx = next_start

        return chunks

    def _find_break_point(self, text: str, start: int, target_end: int) -> int:
        """Finds the best boundary (paragraph -> line -> sentence -> word) to break a chunk."""
        # Minimum chunk size threshold to consider splitting (at least 60% of chunk_size)
        min_split = start + int(self.chunk_size * 0.6)
        search_window = text[min_split:target_end]

        if not search_window:
            return target_end

        # 1. Look for paragraph break (\n\n)
        p_idx = search_window.rfind("\n\n")
        if p_idx != -1:
            return min_split + p_idx + 2

        # 2. Look for line break (\n)
        l_idx = search_window.rfind("\n")
        if l_idx != -1:
            return min_split + l_idx + 1

        # 3. Look for sentence break (. / ! / ?)
        for punct in (". ", "! ", "? "):
            s_idx = search_window.rfind(punct)
            if s_idx != -1:
                return min_split + s_idx + len(punct)

        # 4. Look for word boundary (space)
        w_idx = search_window.rfind(" ")
        if w_idx != -1:
            return min_split + w_idx + 1

        # 5. Fallback: split at target_end
        return target_end

    def _adjust_overlap_start(self, text: str, next_start: int, actual_end: int) -> int:
        """Adjusts overlap start boundary so it doesn't split a word in half."""
        # If already at a space or newline, it's fine
        if text[next_start].isspace():
            return next_start + 1

        # Search forward up to 30 characters for the next whitespace
        forward_limit = min(next_start + 30, actual_end)
        for i in range(next_start, forward_limit):
            if text[i].isspace():
                return i + 1

        return next_start

    def _resolve_pages(
        self, doc: ExtractedDocument, char_start: int, char_end: int
    ) -> tuple[Optional[int], Optional[int]]:
        """Maps character offsets to page numbers."""
        if not doc.pages:
            return None, None

        matching_pages: List[int] = []
        for page in doc.pages:
            if not (char_end < page.char_start or char_start > page.char_end):
                matching_pages.append(page.page_number)

        if matching_pages:
            return min(matching_pages), max(matching_pages)
        return None, None

    def _resolve_section_title(
        self, doc: ExtractedDocument, char_start: int
    ) -> Optional[str]:
        """Resolves the nearest active section heading for a given character start position."""
        if not doc.sections:
            return None

        active_title: Optional[str] = None
        for sec in doc.sections:
            if sec.char_start <= char_start:
                active_title = sec.title
            else:
                break

        return active_title
