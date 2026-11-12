"""Sanitizes tool inputs and outputs to prevent data leakage and payload injection."""

import re
from typing import Any, Dict, List

# Patterns for sensitive credentials
SENSITIVE_KEY_PATTERNS = [
    re.compile(r"password", re.IGNORECASE),
    re.compile(r"secret", re.IGNORECASE),
    re.compile(r"token", re.IGNORECASE),
    re.compile(r"api[_-]?key", re.IGNORECASE),
    re.compile(r"credential", re.IGNORECASE),
    re.compile(r"authorization", re.IGNORECASE),
]

# Inline credential regexes
INLINE_SECRET_PATTERNS = [
    re.compile(r"((?:password|secret|api[_-]?key|token)\s*[:=]\s*)['\"]?([^\s'\"]+)['\"]?", re.IGNORECASE),
    re.compile(r"(bearer\s+)([a-zA-Z0-9\._\-]+)", re.IGNORECASE),
]

MAX_STRING_LENGTH = 10000


def sanitize_text(text: str) -> str:
    """Removes non-printable control characters, masks inline credentials, and enforces length bounds."""
    if not isinstance(text, str):
        return text
    # Strip null bytes and ASCII control characters except \n, \r, \t
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    # Mask inline secrets
    for pattern in INLINE_SECRET_PATTERNS:
        cleaned = pattern.sub(r"\1[REDACTED]", cleaned)
    if len(cleaned) > MAX_STRING_LENGTH:
        cleaned = cleaned[:MAX_STRING_LENGTH] + "... [TRUNCATED DUE TO SIZE]"
    return cleaned


def sanitize_data(data: Any, depth: int = 0) -> Any:
    """Recursively redacts sensitive keys and bounds string lengths in dicts and lists."""
    if depth > 10:
        return "[MAX DEPTH EXCEEDED]"

    if isinstance(data, dict):
        sanitized_dict: Dict[str, Any] = {}
        for k, v in data.items():
            if any(p.search(str(k)) for p in SENSITIVE_KEY_PATTERNS):
                sanitized_dict[k] = "[REDACTED]"
            else:
                sanitized_dict[k] = sanitize_data(v, depth + 1)
        return sanitized_dict

    elif isinstance(data, list):
        return [sanitize_data(item, depth + 1) for item in data[:100]]

    elif isinstance(data, str):
        return sanitize_text(data)

    return data
