import logging
import re
import sys
from app.config.settings import settings

INLINE_SECRET_PATTERNS = [
    re.compile(r"((?:password|secret|api[_-]?key|token)\s*[:=]\s*)['\"]?([^\s'\"]+)['\"]?", re.IGNORECASE),
    re.compile(r"(bearer\s+)([a-zA-Z0-9\._\-]+)", re.IGNORECASE),
    re.compile(r"(sk-[a-zA-Z0-9]{20,})", re.IGNORECASE),
]


class SecretMaskingFilter(logging.Filter):
    """Logging filter that redacts inline API keys, bearer tokens, and secrets from all log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            msg = record.msg
            for pattern in INLINE_SECRET_PATTERNS:
                msg = pattern.sub(r"\1[REDACTED]", msg)
            record.msg = msg

        if record.args:
            if isinstance(record.args, dict):
                sanitized_args = {}
                for k, v in record.args.items():
                    if any(s in str(k).lower() for s in ["password", "token", "secret", "api_key", "key"]):
                        sanitized_args[k] = "[REDACTED]"
                    else:
                        sanitized_args[k] = v
                record.args = sanitized_args
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    "[REDACTED]" if any(s in str(a).lower() for s in ["sk-", "bearer "]) else a
                    for a in record.args
                )
        return True


def setup_logging() -> None:
    """Configures structured application logging with sensitive data redaction."""
    log_format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(SecretMaskingFilter())

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    root_logger.handlers = [handler]


def get_logger(name: str) -> logging.Logger:
    """Returns a named logger instance with secret masking filter."""
    logger = logging.getLogger(name)
    return logger
