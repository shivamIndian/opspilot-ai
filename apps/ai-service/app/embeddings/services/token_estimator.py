"""Token estimation and limit validation using tiktoken."""

from typing import Optional
import tiktoken
from app.embeddings.exceptions import EmbeddingInputTooLargeError

# Maximum tokens supported per input string for text-embedding-3-small / text-embedding-3-large
DEFAULT_MAX_INPUT_TOKENS = 8191


class TokenEstimator:
    """Estimates token counts and validates text against model limits."""

    def __init__(self, model: str = "text-embedding-3-small", max_tokens: int = DEFAULT_MAX_INPUT_TOKENS):
        self.model = model
        self.max_tokens = max_tokens
        try:
            self._encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            self._encoding = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        """Returns exact token count for the given text using the model's BPE tokenizer."""
        if not text:
            return 0
        return len(self._encoding.encode(text, disallowed_special=()))

    def validate_text(self, text: str, chunk_index: Optional[int] = None) -> int:
        """Validates that text does not exceed allowable token limit.

        Returns:
            The token count if valid.

        Raises:
            EmbeddingInputTooLargeError: If text exceeds the maximum allowable token limit.
        """
        token_count = self.count_tokens(text)
        if token_count > self.max_tokens:
            chunk_ref = f" at chunk index {chunk_index}" if chunk_index is not None else ""
            raise EmbeddingInputTooLargeError(
                f"Input text{chunk_ref} contains {token_count} tokens, exceeding maximum limit of {self.max_tokens}"
            )
        return token_count
