"""Centralized tool registry for discovery and lookup."""

import logging
from typing import Dict, List, Optional
from app.tools.base import ToolDefinition
from app.tools.schemas import ToolMetadata
from app.tools.exceptions import ToolNotFoundError, ToolError

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Centralized, strictly validated registry of approved AI agent tools."""

    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}

    def register(self, tool: ToolDefinition) -> None:
        """Registers a tool definition into the registry.

        Raises:
            ToolError: If a tool with the same name is already registered.
        """
        name = tool.name.strip().lower()
        if name in self._tools:
            raise ToolError(
                error_code="TOOL_ALREADY_REGISTERED",
                message=f"Tool with name '{name}' is already registered in registry.",
                is_retryable=False,
            )

        self._tools[name] = tool
        logger.info(
            f"Registered tool: '{name}' (Category: {tool.category}, Risk: {tool.risk_level.value}, Mode: {tool.execution_mode.value})"
        )

    def get(self, name: str) -> ToolDefinition:
        """Retrieves a registered tool definition by name.

        Raises:
            ToolNotFoundError: If tool is not found.
        """
        cleaned_name = name.strip().lower()
        if cleaned_name not in self._tools:
            raise ToolNotFoundError(tool_name=cleaned_name)
        return self._tools[cleaned_name]

    def has(self, name: str) -> bool:
        return name.strip().lower() in self._tools

    def list_tools(self) -> List[ToolDefinition]:
        """Returns all registered tool definitions."""
        return list(self._tools.values())

    def get_discovery_metadata(self) -> List[ToolMetadata]:
        """Returns catalog metadata for all registered tools."""
        return [tool.to_metadata() for tool in self._tools.values()]

    def set_tool_status(self, name: str, enabled: bool) -> None:
        """Dynamically enables or disables a tool."""
        tool = self.get(name)
        tool.enabled = enabled
        logger.info(f"Updated status for tool '{name}': enabled={enabled}")


_registry_instance: Optional[ToolRegistry] = None


def get_tool_registry() -> ToolRegistry:
    """Returns the singleton ToolRegistry instance."""
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = ToolRegistry()
        from app.tools.definitions import register_default_tools
        register_default_tools(_registry_instance)
    return _registry_instance
