"""Tool execution engine with policy enforcement, timeouts, retries, and auditing."""

import asyncio
import json
import logging
import time
from typing import Optional, Dict, Any
from pydantic import ValidationError

from app.tools.registry import ToolRegistry, get_tool_registry
from app.tools.context import ToolExecutionContext
from app.tools.policies import ToolPolicyEngine
from app.tools.sanitizers import sanitize_data
from app.tools.audit import ToolAuditLogger
from app.tools.schemas import (
    ExecuteToolRequest,
    ExecuteToolResponse,
    ToolRiskLevel,
    ToolExecutionMode,
    ToolActionProposal,
)
from app.tools.exceptions import (
    ToolError,
    ToolNotFoundError,
    ToolInputInvalidError,
    ToolExecutionTimeoutError,
    ToolExecutionFailedError,
    ToolOutputInvalidError,
    ToolOutputTooLargeError,
)

logger = logging.getLogger(__name__)

# Maximum response serialization limit: 512 KB
MAX_OUTPUT_BYTES = 512 * 1024


class ToolExecutionEngine:
    """Executes registered tools with strict security validation, timeouts, and auditing."""

    def __init__(self, registry: Optional[ToolRegistry] = None):
        self._registry = registry

    @property
    def registry(self) -> ToolRegistry:
        return self._registry or get_tool_registry()

    async def execute(self, request: ExecuteToolRequest) -> ExecuteToolResponse:
        """Executes a tool within the validated runtime context and returns standardized response."""
        start_time = time.perf_counter()

        # Build immutable execution context
        context = ToolExecutionContext(
            request_id=request.request_id,
            execution_id=request.execution_id,
            authenticated_user_id=request.authenticated_user_id,
            organization_id=request.organization_id,
            delegated_authorization_token=request.delegated_authorization_token,
            permitted_scopes=request.permitted_scopes,
            platform_role=request.platform_role,
            correlation_id=request.correlation_id,
        )

        tool_name = request.tool_name.strip().lower()
        risk_level = ToolRiskLevel.LOW
        execution_mode = ToolExecutionMode.READ_ONLY

        try:
            # 1. Lookup tool in registry
            tool = self.registry.get(tool_name)
            risk_level = tool.risk_level
            execution_mode = tool.execution_mode

            # 2. Evaluate administrative status and security policies
            ToolPolicyEngine.evaluate(tool, context)

            # 3. Validate input arguments against Pydantic schema
            try:
                parsed_input = tool.input_schema.model_validate(request.arguments or {})
            except ValidationError as ve:
                raise ToolInputInvalidError(
                    message=f"Validation failed for tool '{tool.name}': {ve.errors()}",
                    details={"validation_errors": ve.errors()},
                )

            # 4. Execute tool with timeout and retry logic
            attempts = 0
            max_attempts = max(1, tool.max_retries + 1)
            raw_result = None

            while attempts < max_attempts:
                attempts += 1
                try:
                    raw_result = await asyncio.wait_for(
                        tool.execute(parsed_input, context),
                        timeout=tool.timeout_seconds,
                    )
                    break
                except asyncio.TimeoutError:
                    if attempts >= max_attempts:
                        raise ToolExecutionTimeoutError(tool.name, tool.timeout_seconds)
                    logger.warning(
                        f"Tool '{tool.name}' timed out on attempt {attempts}/{max_attempts}, retrying..."
                    )
                    await asyncio.sleep(0.5 * attempts)
                except ToolError as te:
                    if te.is_retryable and attempts < max_attempts:
                        logger.warning(
                            f"Tool '{tool.name}' failed with retryable error on attempt {attempts}: {te}. Retrying..."
                        )
                        await asyncio.sleep(0.5 * attempts)
                        continue
                    raise
                except Exception as ex:
                    logger.error(f"Unexpected error executing tool '{tool.name}': {ex}", exc_info=True)
                    raise ToolExecutionFailedError(
                        message=f"Execution error in tool '{tool.name}': {str(ex)}",
                        is_retryable=False,
                    )

            if raw_result is None:
                raise ToolExecutionFailedError(f"Tool '{tool.name}' completed without returning a result.")

            # 5. Validate output schema & enforce proposal contract for mutation tools
            proposal_obj: Optional[ToolActionProposal] = None
            data_dict: Optional[Dict[str, Any]] = None

            if execution_mode == ToolExecutionMode.PROPOSAL_ONLY:
                if isinstance(raw_result, ToolActionProposal):
                    proposal_obj = raw_result
                elif hasattr(raw_result, "model_dump"):
                    proposal_obj = ToolActionProposal.model_validate(raw_result.model_dump())
                else:
                    proposal_obj = ToolActionProposal.model_validate(raw_result)
            else:
                try:
                    if hasattr(raw_result, "model_dump"):
                        data_dict = raw_result.model_dump()
                    elif isinstance(raw_result, dict):
                        data_dict = tool.output_schema.model_validate(raw_result).model_dump()
                    else:
                        data_dict = tool.output_schema.model_validate(raw_result).model_dump()
                except ValidationError as ve:
                    raise ToolOutputInvalidError(
                        message=f"Tool '{tool.name}' produced invalid output structure: {ve.errors()}",
                        details={"validation_errors": ve.errors()},
                    )

            # 6. Sanitize output and enforce size constraints
            target_data = proposal_obj.model_dump() if proposal_obj else data_dict
            sanitized = sanitize_data(target_data)

            serialized_bytes = len(json.dumps(sanitized, default=str).encode("utf-8"))
            if serialized_bytes > MAX_OUTPUT_BYTES:
                raise ToolOutputTooLargeError(
                    f"Tool output ({serialized_bytes} bytes) exceeds maximum allowable limit ({MAX_OUTPUT_BYTES} bytes)"
                )

            duration_ms = (time.perf_counter() - start_time) * 1000.0

            # 7. Asynchronous audit logging
            summary_str = f"Success ({len(sanitized)} fields)" if isinstance(sanitized, dict) else "Success"
            await ToolAuditLogger.log_execution(
                context=context,
                tool_name=tool.name,
                risk_level=risk_level,
                status="success",
                input_data=request.arguments or {},
                output_summary=summary_str,
                duration_ms=duration_ms,
            )

            if proposal_obj:
                return ExecuteToolResponse(
                    success=True,
                    tool_name=tool.name,
                    execution_id=context.execution_id,
                    risk_level=risk_level,
                    execution_mode=execution_mode,
                    proposal=ToolActionProposal.model_validate(sanitized),
                    duration_ms=duration_ms,
                )
            else:
                return ExecuteToolResponse(
                    success=True,
                    tool_name=tool.name,
                    execution_id=context.execution_id,
                    risk_level=risk_level,
                    execution_mode=execution_mode,
                    data=sanitized,
                    duration_ms=duration_ms,
                )

        except ToolError as te:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.warning(f"Tool execution failed for '{tool_name}' [{te.error_code}]: {te.message}")

            await ToolAuditLogger.log_execution(
                context=context,
                tool_name=tool_name,
                risk_level=risk_level,
                status="failed",
                input_data=request.arguments or {},
                output_summary=te.message,
                duration_ms=duration_ms,
                error_code=te.error_code,
            )

            return ExecuteToolResponse(
                success=False,
                tool_name=tool_name,
                execution_id=context.execution_id,
                risk_level=risk_level,
                execution_mode=execution_mode,
                error={
                    "code": te.error_code,
                    "message": te.message,
                    "is_retryable": te.is_retryable,
                    "details": te.details,
                },
                duration_ms=duration_ms,
            )

        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(f"Unhandled error in ToolExecutionEngine for '{tool_name}': {e}", exc_info=True)

            await ToolAuditLogger.log_execution(
                context=context,
                tool_name=tool_name,
                risk_level=risk_level,
                status="failed",
                input_data=request.arguments or {},
                output_summary=str(e),
                duration_ms=duration_ms,
                error_code="INTERNAL_EXECUTION_ERROR",
            )

            return ExecuteToolResponse(
                success=False,
                tool_name=tool_name,
                execution_id=context.execution_id,
                risk_level=risk_level,
                execution_mode=execution_mode,
                error={
                    "code": "INTERNAL_EXECUTION_ERROR",
                    "message": f"An internal error occurred while executing '{tool_name}': {str(e)}",
                    "is_retryable": False,
                },
                duration_ms=duration_ms,
            )


_engine_instance: Optional[ToolExecutionEngine] = None


def get_tool_execution_engine() -> ToolExecutionEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = ToolExecutionEngine()
    return _engine_instance
