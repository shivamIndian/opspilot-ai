"""Adapter converting OpsPilot ToolDefinitions to LangGraph/LangChain compatible tool structures."""

from typing import List, Dict, Any, Callable, Optional, Type
from pydantic import BaseModel

from app.tools.base import ToolDefinition
from app.tools.context import ToolExecutionContext
from app.tools.registry import ToolRegistry, get_tool_registry
from app.tools.executor import get_tool_execution_engine
from app.tools.schemas import ExecuteToolRequest, ExecuteToolResponse


class LangGraphToolDescriptor:
    """Prepares structured tool descriptors compatible with LangChain/LangGraph agent runtimes in Module 12."""

    def __init__(self, tool: ToolDefinition, context: Optional[ToolExecutionContext] = None):
        self.tool = tool
        self.name = tool.name
        self.description = tool.description
        self.args_schema: Type[BaseModel] = tool.input_schema
        self.return_direct = False
        self._context = context

    def bind_context(self, context: ToolExecutionContext) -> "LangGraphToolDescriptor":
        """Returns a new descriptor bound to a specific runtime execution context."""
        return LangGraphToolDescriptor(self.tool, context)

    async def ainvoke(self, args: Dict[str, Any], context: Optional[ToolExecutionContext] = None) -> Dict[str, Any]:
        """Asynchronously executes the tool through the centralized execution engine."""
        ctx = context or self._context
        if not ctx:
            raise ValueError(
                f"Cannot execute LangGraph tool '{self.name}' without a bound ToolExecutionContext"
            )

        engine = get_tool_execution_engine()
        request = ExecuteToolRequest(
            tool_name=self.name,
            arguments=args,
            request_id=ctx.request_id,
            execution_id=ctx.execution_id,
            authenticated_user_id=ctx.authenticated_user_id,
            organization_id=ctx.organization_id,
            delegated_authorization_token=ctx.delegated_authorization_token,
            permitted_scopes=ctx.permitted_scopes,
            platform_role=ctx.platform_role,
            correlation_id=ctx.correlation_id,
        )

        response: ExecuteToolResponse = await engine.execute(request)
        if not response.success:
            return {"error": response.error, "status": "failed"}

        if response.proposal:
            return {"proposal": response.proposal.model_dump(), "status": "awaiting_approval"}

        return {"data": response.data, "status": "success"}

    def to_openai_tool(self) -> Dict[str, Any]:
        """Exports OpenAI tool call format for LLM function calling."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.tool.input_schema.model_json_schema(),
            },
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "category": self.tool.category,
            "risk_level": self.tool.risk_level.value,
            "execution_mode": self.tool.execution_mode.value,
            "approval_required": self.tool.approval_required,
            "parameters_schema": self.tool.input_schema.model_json_schema(),
        }


def to_langgraph_tool(tool: ToolDefinition, context: Optional[ToolExecutionContext] = None) -> LangGraphToolDescriptor:
    """Wraps a ToolDefinition into a LangGraph-ready tool descriptor."""
    return LangGraphToolDescriptor(tool, context)


def get_langgraph_tools(
    context: Optional[ToolExecutionContext] = None,
    registry: Optional[ToolRegistry] = None,
) -> List[LangGraphToolDescriptor]:
    """Retrieves all registered tools converted to LangGraph-ready descriptors."""
    reg = registry or get_tool_registry()
    return [to_langgraph_tool(tool, context) for tool in reg.list_tools() if tool.enabled]
