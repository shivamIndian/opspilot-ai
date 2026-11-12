"""Base tool definition and interface for all registered agent tools."""

from abc import ABC, abstractmethod
from typing import Type, TypeVar, List, Dict, Any, Optional
from pydantic import BaseModel

from app.tools.context import ToolExecutionContext
from app.tools.schemas import ToolRiskLevel, ToolExecutionMode, ToolMetadata

T_In = TypeVar("T_In", bound=BaseModel)
T_Out = TypeVar("T_Out", bound=BaseModel)


class ToolDefinition(ABC):
    """Abstract base class for all OpsPilot AI agent tools."""

    name: str
    description: str
    category: str
    risk_level: ToolRiskLevel
    approval_required: bool
    execution_mode: ToolExecutionMode
    required_permissions: List[str]
    input_schema: Type[BaseModel]
    output_schema: Type[BaseModel]
    timeout_seconds: float = 30.0
    max_retries: int = 1
    idempotent: bool = True
    enabled: bool = True

    def __init__(
        self,
        name: str,
        description: str,
        category: str,
        risk_level: ToolRiskLevel,
        input_schema: Type[BaseModel],
        output_schema: Type[BaseModel],
        execution_mode: ToolExecutionMode = ToolExecutionMode.READ_ONLY,
        approval_required: bool = False,
        required_permissions: Optional[List[str]] = None,
        timeout_seconds: float = 30.0,
        max_retries: int = 1,
        idempotent: bool = True,
        enabled: bool = True,
    ):
        self.name = name
        self.description = description
        self.category = category
        self.risk_level = risk_level
        self.input_schema = input_schema
        self.output_schema = output_schema
        self.execution_mode = execution_mode
        self.approval_required = approval_required
        self.required_permissions = required_permissions or []
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.idempotent = idempotent
        self.enabled = enabled

    @abstractmethod
    async def execute(
        self,
        input_data: BaseModel,
        context: ToolExecutionContext,
    ) -> BaseModel:
        """Asynchronously executes the tool operation with validated input and trusted context."""
        pass

    def to_metadata(self) -> ToolMetadata:
        """Converts definition into JSON Schema metadata for model calling and discovery."""
        return ToolMetadata(
            name=self.name,
            description=self.description,
            category=self.category,
            risk_level=self.risk_level,
            approval_required=self.approval_required,
            execution_mode=self.execution_mode,
            required_permissions=self.required_permissions,
            timeout_seconds=self.timeout_seconds,
            idempotent=self.idempotent,
            enabled=self.enabled,
            parameters_schema=self.input_schema.model_json_schema(),
        )
