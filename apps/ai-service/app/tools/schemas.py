"""Pydantic schemas and enums for tool registry, metadata, and execution."""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class ToolRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ToolExecutionMode(str, Enum):
    READ_ONLY = "read_only"
    PROPOSAL_ONLY = "proposal_only"


class ToolMetadata(BaseModel):
    """Metadata describing a tool for discovery and cataloging."""

    name: str = Field(..., description="Unique tool identifier")
    description: str = Field(..., description="Detailed description of tool purpose and behavior")
    category: str = Field(..., description="Tool category (e.g. knowledge, tickets, users)")
    risk_level: ToolRiskLevel = Field(..., description="Declared risk classification")
    approval_required: bool = Field(default=False, description="Whether human approval is required")
    execution_mode: ToolExecutionMode = Field(..., description="read_only or proposal_only")
    required_permissions: List[str] = Field(default_factory=list, description="Scopes needed to invoke")
    timeout_seconds: float = Field(default=30.0, description="Max execution timeout in seconds")
    idempotent: bool = Field(default=True, description="Whether the tool is idempotent")
    enabled: bool = Field(default=True, description="Whether the tool is active")
    parameters_schema: Dict[str, Any] = Field(default_factory=dict, description="JSON Schema of tool arguments")


class ToolActionProposal(BaseModel):
    """Standardized action proposal produced by mutation tools in Module 11."""

    proposal_id: str = Field(..., description="Unique proposal UUID")
    organization_id: str = Field(..., description="Target organization UUID")
    requested_by: str = Field(..., description="Authenticated user UUID requesting action")
    tool_name: str = Field(..., description="Tool that generated proposal")
    risk_level: ToolRiskLevel = Field(default=ToolRiskLevel.HIGH)
    approval_required: bool = Field(default=True)
    execution_mode: ToolExecutionMode = Field(default=ToolExecutionMode.PROPOSAL_ONLY)
    proposed_action: Dict[str, Any] = Field(..., description="Validated action parameters awaiting approval")
    status: str = Field(default="awaiting_approval", description="Initial lifecycle state")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ExecuteToolRequest(BaseModel):
    """Internal API payload to invoke a registered tool."""

    tool_name: str = Field(..., description="Name of the registered tool to invoke")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="LLM-generated tool arguments")
    # Trusted execution context passed from Node.js backend
    request_id: str
    execution_id: str
    authenticated_user_id: str
    organization_id: str
    delegated_authorization_token: str
    permitted_scopes: List[str] = Field(default_factory=list)
    platform_role: str = "user"
    correlation_id: Optional[str] = None


class ExecuteToolResponse(BaseModel):
    """Standardized result returned from tool execution engine."""

    success: bool
    tool_name: str
    execution_id: str
    risk_level: ToolRiskLevel
    execution_mode: ToolExecutionMode
    data: Optional[Dict[str, Any]] = None
    proposal: Optional[ToolActionProposal] = None
    error: Optional[Dict[str, Any]] = None
    duration_ms: float
