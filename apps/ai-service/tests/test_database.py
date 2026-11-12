import pytest
from app.database.connection import get_sanitized_database_url


def test_get_sanitized_database_url():
    raw_url = "postgresql+asyncpg://opspilot_ai:super_secret_ai_pass@localhost:5432/opspilot_db"
    sanitized = get_sanitized_database_url(raw_url)

    assert "super_secret_ai_pass" not in sanitized
    assert "***REDACTED***" in sanitized
    assert "opspilot_db" in sanitized


def test_sanitized_database_url_fallback():
    malformed = "invalid-url-string"
    sanitized = get_sanitized_database_url(malformed)
    assert sanitized == "invalid-url-string" or "***REDACTED***" in sanitized
