"""Internal authenticated router for AI agent tool discovery and execution."""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status, HTTPException
from pydantic import BaseModel

from app.embeddings.router import verify_internal_service_token
from app.tools.registry import ToolRegistry, get_tool_registry
from app.tools.executor import ToolExecutionEngine, get_tool_execution_engine
from app.tools.schemas import ToolMetadata, ExecuteToolRequest, ExecuteToolResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/v1/tools", tags=["internal-agent-tools"])


class ToolDiscoveryResponse(BaseModel):
    success: bool = True
    total_tools: int
    tools: List[ToolMetadata]


@router.get(
    "",
    response_model=ToolDiscoveryResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Discover Registered Agent Tools",
    description="Returns metadata and JSON Schema definitions for all registered tools.",
)
async def discover_tools(
    registry: ToolRegistry = Depends(get_tool_registry),
) -> ToolDiscoveryResponse:
    metadata_list = registry.get_discovery_metadata()
    return ToolDiscoveryResponse(
        success=True,
        total_tools=len(metadata_list),
        tools=metadata_list,
    )


@router.post(
    "/execute",
    response_model=ExecuteToolResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Execute Agent Tool",
    description="Securely executes an approved tool within verified organizational runtime context.",
)
async def execute_tool(
    request: ExecuteToolRequest,
    engine: ToolExecutionEngine = Depends(get_tool_execution_engine),
) -> ExecuteToolResponse:
    try:
        response = await engine.execute(request)
        return response
    except Exception as e:
        logger.exception(f"Unhandled error in tool execution router: {e}")
        return ExecuteToolResponse(
            success=False,
            tool_name=request.tool_name,
            execution_id=request.execution_id,
            risk_level=request.arguments.get("risk_level", "low"),  # type: ignore[arg-type]
            execution_mode=request.arguments.get("execution_mode", "read_only"),  # type: ignore[arg-type]
            error={
                "code": "INTERNAL_TOOL_ERROR",
                "message": str(e),
                "is_retryable": False,
            },
            duration_ms=0.0,
        )
