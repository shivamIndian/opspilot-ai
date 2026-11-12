"""Security screening service for agent memory content.

Detects and blocks sensitive credentials, secrets, financial data, PII, and prompt injections.
"""

import re
import logging
from typing import Tuple, List, Optional
from app.memory.exceptions import MemoryScreeningError

logger = logging.getLogger("opspilot.memory.screening")


class MemoryScreeningService:
    """Detects and screens prohibited or sensitive content before memory storage."""

    # Pre-compiled regex patterns for sensitive data
    CREDENTIAL_PATTERNS = [
        (re.compile(r"sk-[a-zA-Z0-9_-]{20,}", re.IGNORECASE), "OpenAI API Key"),
        (re.compile(r"gh[pousr]_[A-Za-z0-9_]{36,}", re.IGNORECASE), "GitHub Personal Access Token"),
        (re.compile(r"xox[baprs]-[a-zA-Z0-9-]{10,}", re.IGNORECASE), "Slack Token"),
        (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AWS Access Key ID"),
        (re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"), "Private Key"),
        (re.compile(r"eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}", re.IGNORECASE), "JWT Token"),
        (re.compile(r"(?:bearer\s+[a-zA-Z0-9_\-\.]{25,})", re.IGNORECASE), "Bearer Authentication Token"),
        (re.compile(r"(?:password|passwd|pwd|secret)\s*[:=]\s*['\"][^\s'\"]{6,}['\"]", re.IGNORECASE), "Plaintext Secret/Password"),
    ]

    FINANCIAL_PII_PATTERNS = [
        (re.compile(r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b"), "Credit Card Number"),
        (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "Social Security Number (SSN)"),
    ]

    PROMPT_INJECTION_PATTERNS = [
        (re.compile(r"ignore\s+(?:all\s+)?previous\s+instructions", re.IGNORECASE), "Prompt Injection: Ignore Instructions"),
        (re.compile(r"disregard\s+(?:all\s+)?system\s+(?:prompts?|instructions?)", re.IGNORECASE), "Prompt Injection: Disregard System Instructions"),
        (re.compile(r"you\s+are\s+now\s+(?:DAN|unfiltered|jailbroken)", re.IGNORECASE), "Prompt Injection: Jailbreak Persona"),
        (re.compile(r"(?:admin\s+override|bypass\s+security\s+checks|grant\s+(?:super)?admin)", re.IGNORECASE), "Prompt Injection: Privilege Escalation"),
        (re.compile(r"<system_instructions>.*?</system_instructions>", re.IGNORECASE | re.DOTALL), "Prompt Injection: Malicious XML Tag Spoofing"),
    ]

    def screen_text(self, text: str) -> Tuple[bool, List[str]]:
        """Screen raw text string for sensitive content or injection attempts.
        
        Returns:
            Tuple[bool, List[str]]: (is_safe, list_of_violations)
        """
        if not text:
            return True, []

        violations: List[str] = []

        # 1. Credentials & Secrets
        for pattern, label in self.CREDENTIAL_PATTERNS:
            if pattern.search(text):
                violations.append(f"Credential detected: {label}")

        # 2. Financial & Government PII
        for pattern, label in self.FINANCIAL_PII_PATTERNS:
            if pattern.search(text):
                violations.append(f"Sensitive PII detected: {label}")

        # 3. Prompt Injections & Jailbreaks
        for pattern, label in self.PROMPT_INJECTION_PATTERNS:
            if pattern.search(text):
                violations.append(f"Hostile prompt injection pattern detected: {label}")

        is_safe = len(violations) == 0
        if not is_safe:
            logger.warning("Memory screening flagged prohibited content: %s", violations)

        return is_safe, violations

    def assert_clean(self, text: str, context_label: str = "memory content") -> None:
        """Screen text and raise MemoryScreeningError if violations are found."""
        is_safe, violations = self.screen_text(text)
        if not is_safe:
            violation_summary = "; ".join(violations)
            raise MemoryScreeningError(
                f"Proposed {context_label} rejected by security screening: {violation_summary}",
                violations=violations,
            )


# Singleton instance
_screening_service: Optional[MemoryScreeningService] = None


def get_memory_screening_service() -> MemoryScreeningService:
    global _screening_service
    if _screening_service is None:
        _screening_service = MemoryScreeningService()
    return _screening_service
