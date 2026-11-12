"""Tool definitions package and standard registration."""

import logging
from app.tools.registry import ToolRegistry, get_tool_registry
from app.tools.definitions.knowledge_tools import SearchKnowledgeBaseTool
from app.tools.definitions.ticket_tools import (
    GetTicketDetailsTool,
    CreateSupportTicketTool,
    UpdateSupportTicketTool,
)
from app.tools.definitions.user_tools import SearchUserInformationTool
from app.tools.definitions.support_history_tools import SummarizeSupportHistoryTool

logger = logging.getLogger(__name__)


def register_default_tools(registry: ToolRegistry = None) -> ToolRegistry:
    """Registers all 6 approved Module 11 enterprise tools in the tool registry."""
    reg = registry or get_tool_registry()

    tools = [
        SearchKnowledgeBaseTool(),
        GetTicketDetailsTool(),
        CreateSupportTicketTool(),
        UpdateSupportTicketTool(),
        SearchUserInformationTool(),
        SummarizeSupportHistoryTool(),
    ]

    for tool in tools:
        try:
            reg.register(tool)
        except Exception as e:
            logger.debug(f"[ToolRegistry] Tool '{tool.name}' registration notice: {e}")

    return reg
