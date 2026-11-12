import pytest
from app.redis.client import get_sanitized_redis_url


def test_get_sanitized_redis_url():
    raw_url = "redis://:super_secret_redis_pass@localhost:6379/1"
    sanitized = get_sanitized_redis_url(raw_url)

    assert "super_secret_redis_pass" not in sanitized
    assert "***REDACTED***" in sanitized
    assert "6379" in sanitized


def test_sanitized_redis_url_fallback():
    malformed = "invalid-redis-string"
    sanitized = get_sanitized_redis_url(malformed)
    assert sanitized == "invalid-redis-string" or "***REDACTED***" in sanitized
