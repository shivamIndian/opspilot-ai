"""Standardized tool execution exceptions and error codes."""

from typing import Optional, Dict, Any


class ToolError(Exception):
    """Base exception for all agent tool registration, authorization, and execution errors."""

    def __init__(
        self,
        error_code: str,
        message: str,
        is_retryable: bool = False,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.error_code = error_code
        self.message = message
        self.is_retryable = is_retryable
        self.details = details or {}


class ToolNotFoundError(ToolError):
    def __init__(self, tool_name: str):
        super().__init__(
            error_code="TOOL_NOT_FOUND",
            message=f"Tool '{tool_name}' is not registered in the system",
            is_retryable=False,
            details={"tool_name": tool_name},
        )


class ToolDisabledError(ToolError):
    def __init__(self, tool_name: str):
        super().__init__(
            error_code="TOOL_DISABLED",
            message=f"Tool '{tool_name}' is currently disabled by administrative policy",
            is_retryable=False,
            details={"tool_name": tool_name},
        )


class ToolInputInvalidError(ToolError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="TOOL_INPUT_INVALID",
            message=message,
            is_retryable=False,
            details=details,
        )


class ToolPermissionDeniedError(ToolError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="TOOL_PERMISSION_DENIED",
            message=message,
            is_retryable=False,
            details=details,
        )


class ToolExecutionTimeoutError(ToolError):
    def __init__(self, tool_name: str, timeout_seconds: float):
        super().__init__(
            error_code="TOOL_EXECUTION_TIMEOUT",
            message=f"Execution of tool '{tool_name}' timed out after {timeout_seconds}s",
            is_retryable=True,
            details={"tool_name": tool_name, "timeout_seconds": timeout_seconds},
        )


class ToolExecutionFailedError(ToolError):
    def __init__(self, message: str, is_retryable: bool = False, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="TOOL_EXECUTION_FAILED",
            message=message,
            is_retryable=is_retryable,
            details=details,
        )


class ToolRateLimitedError(ToolError):
    def __init__(self, message: str = "Tool invocation rate limit exceeded"):
        super().__init__(
            error_code="TOOL_RATE_LIMITED",
            message=message,
            is_retryable=True,
        )


class ToolOutputInvalidError(ToolError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="TOOL_OUTPUT_INVALID",
            message=message,
            is_retryable=False,
            details=details,
        )


class ToolOutputTooLargeError(ToolError):
    def __init__(self, message: str = "Tool output exceeds permitted payload size limits"):
        super().__init__(
            error_code="TOOL_OUTPUT_TOO_LARGE",
            message=message,
            is_retryable=False,
        )


class ToolApprovalRequiredError(ToolError):
    def __init__(self, tool_name: str, proposal_id: str):
        super().__init__(
            error_code="TOOL_APPROVAL_REQUIRED",
            message=f"Tool '{tool_name}' is high risk and requires human approval. Proposal created.",
            is_retryable=False,
            details={"tool_name": tool_name, "proposal_id": proposal_id},
        )


class DelegationInvalidError(ToolError):
    def __init__(self, message: str = "Delegated authorization token is invalid or corrupt"):
        super().__init__(
            error_code="DELEGATION_INVALID",
            message=message,
            is_retryable=False,
        )


class DelegationExpiredError(ToolError):
    def __init__(self, message: str = "Delegated authorization token has expired"):
        super().__init__(
            error_code="DELEGATION_EXPIRED",
            message=message,
            is_retryable=False,
        )


class OrganizationContextInvalidError(ToolError):
    def __init__(self, message: str = "Invalid or mismatched organization context in delegation"):
        super().__init__(
            error_code="ORGANIZATION_CONTEXT_INVALID",
            message=message,
            is_retryable=False,
        )
