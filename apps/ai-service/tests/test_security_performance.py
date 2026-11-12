import logging
import pytest
from app.tools.ssrf_guard import validate_outbound_url, SSRFSecurityViolation
from app.core.logging import SecretMaskingFilter
from app.tools.sanitizers import sanitize_data, sanitize_text


class TestSSRFGuard:
    def test_allows_valid_https_url(self):
        url = "https://api.example.com/v1/resource"
        validated = validate_outbound_url(url, allow_private=True)
        assert validated == url

    def test_blocks_cloud_metadata_ip(self):
        metadata_url = "http://169.254.169.254/latest/meta-data/"
        with pytest.raises(SSRFSecurityViolation, match="cloud metadata IP"):
            validate_outbound_url(metadata_url)

    def test_blocks_loopback_ip(self):
        loopback_url = "http://127.0.0.1:8000/internal"
        with pytest.raises(SSRFSecurityViolation, match="loopback IP"):
            validate_outbound_url(loopback_url)

    def test_blocks_private_network_ip_by_default(self):
        private_url = "http://10.0.0.5:9000/api"
        with pytest.raises(SSRFSecurityViolation, match="private internal network IP"):
            validate_outbound_url(private_url, allow_private=False)

    def test_blocks_forbidden_schemes(self):
        with pytest.raises(SSRFSecurityViolation, match="Forbidden protocol scheme"):
            validate_outbound_url("file:///etc/passwd")

        with pytest.raises(SSRFSecurityViolation, match="Forbidden protocol scheme"):
            validate_outbound_url("ftp://example.com/file.txt")


class TestSecretMaskingLogging:
    def test_masking_filter_redacts_inline_secrets(self):
        masking_filter = SecretMaskingFilter()
        record = logging.LogRecord(
            name="test_logger",
            level=logging.INFO,
            pathname=__file__,
            lineno=42,
            msg="User login failed with password='MySecretPassword123' and api_key=sk-proj-123456789012345678901234",
            args=(),
            exc_info=None,
        )

        assert masking_filter.filter(record) is True
        assert "MySecretPassword123" not in record.msg
        assert "sk-proj-" not in record.msg
        assert "[REDACTED]" in record.msg

    def test_masking_filter_redacts_bearer_token(self):
        masking_filter = SecretMaskingFilter()
        record = logging.LogRecord(
            name="test_logger",
            level=logging.INFO,
            pathname=__file__,
            lineno=55,
            msg="Request received with Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
            args=(),
            exc_info=None,
        )

        assert masking_filter.filter(record) is True
        assert "Bearer [REDACTED]" in record.msg
        assert "eyJhbGci" not in record.msg


class TestDataSanitization:
    def test_sanitizes_nested_dict_secrets(self):
        data = {
            "query": "How to deploy?",
            "secret_key": "super_secret_token",
            "nested": {
                "password": "p@ssword",
                "normal": "safe_value",
            },
        }

        sanitized = sanitize_data(data)
        assert sanitized["secret_key"] == "[REDACTED]"
        assert sanitized["nested"]["password"] == "[REDACTED]"
        assert sanitized["nested"]["normal"] == "safe_value"
        assert sanitized["query"] == "How to deploy?"

    def test_strips_control_characters(self):
        text_with_null = "Hello\x00World\x08!"
        sanitized = sanitize_text(text_with_null)
        assert sanitized == "HelloWorld!"
