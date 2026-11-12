"""Trusted runtime execution context for agent tools."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional
import uuid


@dataclass(frozen=True)
class ToolExecutionContext:
    """Immutable runtime execution context constructed by trusted backend orchestration.

    CRITICAL SECURITY REQUIREMENT:
    None of these fields are ever exposed to the LLM or accepted as model-visible tool arguments.
    """

    request_id: str
    execution_id: str
    authenticated_user_id: str
    organization_id: str
    delegated_authorization_token: str
    permitted_scopes: List[str] = field(default_factory=list)
    platform_role: str = "user"
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def has_scope(self, scope: str) -> bool:
        """Checks if the delegated context possesses a specific permission scope."""
        if "*" in self.permitted_scopes:
            return True
        if scope in self.permitted_scopes:
            return True
        # Support aliases e.g. 'knowledge:read' <-> 'tools:knowledge:read'
        parts = scope.split(":")
        if len(parts) == 3 and parts[0] == "tools":
            short_scope = f"{parts[1]}:{parts[2]}"
            if short_scope in self.permitted_scopes:
                return True
        elif len(parts) == 2:
            expanded_scope = f"tools:{parts[0]}:{parts[1]}"
            if expanded_scope in self.permitted_scopes:
                return True
        if "tools:read" in self.permitted_scopes and scope.endswith(":read"):
            return True
        if "tools:write" in self.permitted_scopes and scope.endswith(":write"):
            return True
        return False
