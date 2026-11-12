"""Citation validation and hallucination-prevention service."""

import logging
from typing import List, Set, Tuple
from app.llm.schemas import SourceContextItem

logger = logging.getLogger(__name__)


class CitationValidator:
    """Validates cited source IDs against authorized context and removes hallucinated references."""

    @staticmethod
    def validate_citations(
        cited_ids: List[str],
        available_sources: List[SourceContextItem],
    ) -> Tuple[List[str], List[str]]:
        """Validates that all cited source IDs belong to the supplied authorized sources.

        Returns:
            Tuple of (sanitized_valid_ids, additional_limitation_warnings)
        """
        valid_id_set: Set[str] = {s.source_id for s in available_sources}
        sanitized_ids: List[str] = []
        limitations: List[str] = []
        unknown_ids: List[str] = []

        seen: Set[str] = set()
        for cid in cited_ids:
            normalized_id = cid.strip()
            if normalized_id in seen:
                continue
            seen.add(normalized_id)

            if normalized_id in valid_id_set:
                sanitized_ids.append(normalized_id)
            else:
                unknown_ids.append(normalized_id)

        if unknown_ids:
            logger.warning(
                f"Model returned invalid/unauthorized citation IDs: {unknown_ids}. Stripping from response."
            )
            limitations.append(
                f"Removed {len(unknown_ids)} unsupported source citations ({', '.join(unknown_ids)}) "
                f"that were not present in authorized reference documentation."
            )

        return sanitized_ids, limitations
