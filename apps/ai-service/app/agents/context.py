"""Trusted runtime execution context for agent workflow runs."""

from dataclasses import dataclass, field
from typing import List, Optional

from app.tools.context import ToolExecutionContext


@dataclass(frozen=True)
class WorkflowContext:
    """Immutable trusted runtime context provided by authenticated Node.js backend.
    
    Contains cryptographic assertions, tenant identity, and authorized scopes.
    Never exposed to or modified by LLM model parameters.
    """

    authenticated_user_id: str
    organization_id: str
    request_id: str
    delegated_authorization_token: str
    permitted_scopes: List[str] = field(default_factory=list)
    organization_role: str = "member"
    correlation_id: Optional[str] = None
    workflow_version: str = "v1.0"

    def has_scope(self, required_scope: str) -> bool:
        """Determines if the delegated token contains the requested permission scope."""
        return required_scope in self.permitted_scopes

    def to_tool_execution_context(self, execution_id: str) -> ToolExecutionContext:
        """Converts trusted workflow context into a Module 11 ToolExecutionContext."""
        return ToolExecutionContext(
            request_id=self.request_id,
            execution_id=execution_id,
            authenticated_user_id=self.authenticated_user_id,
            organization_id=self.organization_id,
            delegated_authorization_token=self.delegated_authorization_token,
            permitted_scopes=self.permitted_scopes,
            platform_role=self.organization_role,
            correlation_id=self.correlation_id,
        )
