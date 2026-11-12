"""Context builder and token budget manager for RAG generation."""

import logging
from typing import List, Tuple, Optional
import tiktoken

from app.llm.schemas import SourceContextItem
from app.llm.exceptions import LLMContextTooLargeError

logger = logging.getLogger(__name__)


class ContextBuilder:
    """Formats, delimits, and bounds retrieved source context within model token limits."""

    def __init__(self, default_max_tokens: int = 8000, model: str = "gpt-4o-mini"):
        self.default_max_tokens = default_max_tokens
        self.model = model
        try:
            self._tokenizer = tiktoken.encoding_for_model(model)
        except Exception:
            self._tokenizer = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        """Calculates accurate token count using model-compatible tokenizer."""
        return len(self._tokenizer.encode(text))

    def format_source_block(self, item: SourceContextItem) -> str:
        """Formats a single source context item into an isolated reference block."""
        page_info = f"Pages {item.page_start}–{item.page_end}" if item.page_start and item.page_end and item.page_start != item.page_end else (f"Page {item.page_start}" if item.page_start else "N/A")
        section_info = item.section_title or "General"

        return (
            f"--- SOURCE [{item.source_id}] ---\n"
            f"Document: {item.document_name}\n"
            f"Location: {page_info} | Section: {section_info}\n"
            f"Content:\n{item.content.strip()}\n"
        )

    def build_context(
        self,
        sources: List[SourceContextItem],
        max_tokens: Optional[int] = None,
    ) -> Tuple[str, List[SourceContextItem], int]:
        """Builds structured context string while strictly enforcing token budget.

        Returns:
            Tuple of (formatted_context_string, included_sources, total_context_tokens)
        """
        budget = max_tokens or self.default_max_tokens
        if not sources:
            return "", [], 0

        included_sources: List[SourceContextItem] = []
        context_blocks: List[str] = []
        accumulated_tokens = 0

        # Preserve top-ranked sources first
        for source in sources:
            block = self.format_source_block(source)
            block_tokens = self.count_tokens(block)

            if accumulated_tokens + block_tokens > budget:
                logger.warning(
                    f"Context budget ({budget} tokens) reached. Omitting remaining "
                    f"{len(sources) - len(included_sources)} lower-ranked sources."
                )
                break

            context_blocks.append(block)
            included_sources.append(source)
            accumulated_tokens += block_tokens

        formatted_context = "\n".join(context_blocks)
        return formatted_context, included_sources, accumulated_tokens
