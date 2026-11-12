"""Domain exceptions and standardized error codes for the LangGraph workflow engine."""

from typing import Optional, Dict, Any


class WorkflowError(Exception):
    """Base exception for all agent workflow lifecycle and node execution errors."""

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


class WorkflowInvalidInputError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="WORKFLOW_INVALID_INPUT",
            message=message,
            is_retryable=False,
            details=details,
        )


class WorkflowClassificationFailedError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="WORKFLOW_CLASSIFICATION_FAILED",
            message=message,
            is_retryable=True,
            details=details,
        )


class WorkflowPlanInvalidError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="WORKFLOW_PLAN_INVALID",
            message=message,
            is_retryable=False,
            details=details,
        )


class WorkflowPolicyBlockedError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="WORKFLOW_POLICY_BLOCKED",
            message=message,
            is_retryable=False,
            details=details,
        )


class WorkflowToolUnavailableError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="WORKFLOW_TOOL_UNAVAILABLE",
            message=message,
            is_retryable=True,
            details=details,
        )


class WorkflowExecutionTimeoutError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="WORKFLOW_EXECUTION_TIMEOUT",
            message=message,
            is_retryable=True,
            details=details,
        )


class WorkflowCheckpointFailureError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="WORKFLOW_CHECKPOINT_FAILURE",
            message=message,
            is_retryable=True,
            details=details,
        )


class WorkflowStateInvalidError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="WORKFLOW_STATE_INVALID",
            message=message,
            is_retryable=False,
            details=details,
        )


class WorkflowRunNotFoundError(WorkflowError):
    def __init__(self, run_id: str):
        super().__init__(
            error_code="WORKFLOW_RUN_NOT_FOUND",
            message=f"Workflow run '{run_id}' not found",
            is_retryable=False,
            details={"run_id": run_id},
        )


class WorkflowAccessDeniedError(WorkflowError):
    def __init__(self, message: str = "Access denied to workflow run", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="WORKFLOW_ACCESS_DENIED",
            message=message,
            is_retryable=False,
            details=details,
        )


class WorkflowDuplicateRequestError(WorkflowError):
    def __init__(self, request_id: str):
        super().__init__(
            error_code="WORKFLOW_DUPLICATE_REQUEST",
            message=f"A workflow run for request_id '{request_id}' has already been initiated",
            is_retryable=False,
            details={"request_id": request_id},
        )


class WorkflowLLMUnavailableError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="WORKFLOW_LLM_UNAVAILABLE",
            message=message,
            is_retryable=True,
            details=details,
        )


class WorkflowRetrievalUnavailableError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="WORKFLOW_RETRIEVAL_UNAVAILABLE",
            message=message,
            is_retryable=True,
            details=details,
        )


# Module 13 Multi-Step Planning & Execution Limit Exceptions


class PlanValidationError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="PLAN_VALIDATION_ERROR",
            message=message,
            is_retryable=False,
            details=details,
        )


class PlanDependencyCycleError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="PLAN_DEPENDENCY_CYCLE",
            message=message,
            is_retryable=False,
            details=details,
        )


class PlanUnknownDependencyError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="PLAN_UNKNOWN_DEPENDENCY",
            message=message,
            is_retryable=False,
            details=details,
        )


class PlanStepLimitExceededError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="PLAN_STEP_LIMIT_EXCEEDED",
            message=message,
            is_retryable=False,
            details=details,
        )


class PlanReplanningLimitExceededError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="REPLANNING_LIMIT_EXCEEDED",
            message=message,
            is_retryable=False,
            details=details,
        )


class ToolCallLimitExceededError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="TOOL_CALL_LIMIT_EXCEEDED",
            message=message,
            is_retryable=False,
            details=details,
        )


class ToolExecutionRetryError(WorkflowError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="TOOL_RETRY_EXCEEDED",
            message=message,
            is_retryable=False,
            details=details,
        )
