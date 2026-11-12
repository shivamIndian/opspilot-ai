"""Input validation for agent memory candidates and create/update requests."""

import re
from typing import Tuple, List
from app.memory.schemas import MemoryCandidateProposal


class MemoryValidator:
    """Validates structural and content boundaries for memories."""

    MIN_CONTENT_LENGTH = 3
    MAX_CONTENT_LENGTH = 4000
    MIN_TITLE_LENGTH = 3
    MAX_TITLE_LENGTH = 200

    @classmethod
    def validate_candidate(cls, candidate: MemoryCandidateProposal) -> Tuple[bool, List[str]]:
        """Validate candidate proposal."""
        errors: List[str] = []

        if not candidate.title or len(candidate.title.strip()) < cls.MIN_TITLE_LENGTH:
            errors.append(f"Title must be at least {cls.MIN_TITLE_LENGTH} characters long.")
        elif len(candidate.title) > cls.MAX_TITLE_LENGTH:
            errors.append(f"Title exceeds maximum length of {cls.MAX_TITLE_LENGTH} characters.")

        if not candidate.content or len(candidate.content.strip()) < cls.MIN_CONTENT_LENGTH:
            errors.append(f"Content must be at least {cls.MIN_CONTENT_LENGTH} characters long.")
        elif len(candidate.content) > cls.MAX_CONTENT_LENGTH:
            errors.append(f"Content exceeds maximum length of {cls.MAX_CONTENT_LENGTH} characters.")

        if candidate.importance_score < 1 or candidate.importance_score > 10:
            errors.append("Importance score must be between 1 and 10.")

        if candidate.confidence < 0.0 or candidate.confidence > 1.0:
            errors.append("Confidence must be between 0.0 and 1.0.")

        return len(errors) == 0, errors
