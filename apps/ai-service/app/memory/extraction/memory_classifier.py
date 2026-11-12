"""Classifier and normalizer for agent memory records."""

from typing import Tuple
from app.memory.schemas import MemoryType


class MemoryClassifier:
    """Classifies memory categories and normalizes importance scores."""

    VALID_TYPES = {m.value for m in MemoryType}

    DEFAULT_CATEGORIES = {
        MemoryType.PREFERENCE: "user_preference",
        MemoryType.CONTEXTUAL_FACT: "operational_context",
        MemoryType.WORKFLOW_SUMMARY: "workflow_history",
        MemoryType.RECURRING_PATTERN: "usage_pattern",
    }

    @classmethod
    def normalize_type_and_category(cls, raw_type: str, raw_category: str) -> Tuple[MemoryType, str]:
        """Normalize raw memory type and category string."""
        clean_type_str = (raw_type or "").lower().strip()
        matched_type = MemoryType.PREFERENCE
        for mem_type in MemoryType:
            if mem_type.value == clean_type_str:
                matched_type = mem_type
                break

        clean_cat = (raw_category or "").lower().strip()
        if not clean_cat:
            clean_cat = cls.DEFAULT_CATEGORIES[matched_type]
        else:
            # sanitize category
            clean_cat = "".join(c if c.isalnum() or c in ("_", "-") else "_" for c in clean_cat)[:50]

        return matched_type, clean_cat

    @classmethod
    def clamp_importance(cls, score: int) -> int:
        """Clamp importance score between 1 and 10."""
        try:
            val = int(score)
            return max(1, min(10, val))
        except (ValueError, TypeError):
            return 5
