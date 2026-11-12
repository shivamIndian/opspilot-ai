"""Tool permission and execution policy engine."""

import logging
from typing import List
from app.tools.base import ToolDefinition
from app.tools.context import ToolExecutionContext
from app.tools.schemas import ToolRiskLevel, ToolExecutionMode
from app.tools.exceptions import (
    ToolDisabledError,
    ToolPermissionDeniedError,
)

logger = logging.getLogger(__name__)


class ToolPolicyEngine:
    """Evaluates security permissions, organizational boundaries, and risk policies for tool calls."""

    @staticmethod
    def evaluate(tool: ToolDefinition, context: ToolExecutionContext) -> None:
        """Validates that the invocation is permissible under current policies.

        Raises:
            ToolDisabledError: If the tool is administratively turned off.
            ToolPermissionDeniedError: If context lacks required scopes or is unauthorized.
        """
        # 1. Availability check
        if not tool.enabled:
            raise ToolDisabledError(tool.name)

        # 2. Scope & Permission verification
        if tool.required_permissions:
            missing_scopes: List[str] = [
                scope for scope in tool.required_permissions if not context.has_scope(scope)
            ]
            if missing_scopes:
                logger.warning(
                    f"Tool '{tool.name}' execution blocked: User '{context.authenticated_user_id}' "
                    f"in org '{context.organization_id}' missing scopes: {missing_scopes}"
                )
                raise ToolPermissionDeniedError(
                    f"Permission denied for tool '{tool.name}'. Required scopes: {tool.required_permissions}",
                    details={"missing_scopes": missing_scopes, "tool_name": tool.name},
                )

        # 3. Mutation safeguard
        if tool.execution_mode == ToolExecutionMode.PROPOSAL_ONLY and not tool.approval_required:
            # Defensive integrity check
            logger.error(f"Configuration anomaly: Proposal-only tool '{tool.name}' must require approval.")
