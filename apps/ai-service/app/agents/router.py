"""Internal authenticated API router for LangGraph workflow execution and status."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, HTTPException, status

from app.embeddings.router import verify_internal_service_token
from app.agents.schemas import (
    RunWorkflowRequest,
    RunWorkflowResponse,
    WorkflowStatusResponse,
    ResumeWorkflowRequest,
    ResumeWorkflowResponse,
    WorkflowAnalyticsResponse,
    WorkflowRunListResponse,
)
from app.agents.services import (
    WorkflowExecutionService,
    get_workflow_execution_service,
    WorkflowStatusService,
    get_workflow_status_service,
)
from app.agents.exceptions import (
    WorkflowRunNotFoundError,
    WorkflowInvalidInputError,
    WorkflowAccessDeniedError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/v1/agent/workflows", tags=["internal-agent-workflows"])


@router.post(
    "/run",
    response_model=RunWorkflowResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Execute Agent Workflow",
    description="Asynchronously runs the OpsPilot stateful LangGraph workflow.",
)
async def run_workflow_endpoint(
    request: RunWorkflowRequest,
    service: WorkflowExecutionService = Depends(get_workflow_execution_service),
) -> RunWorkflowResponse:
    try:
        run_data = await service.execute_workflow(request)
        return RunWorkflowResponse(success=True, data=run_data)
    except WorkflowInvalidInputError as wie:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": wie.error_code, "message": wie.message, "details": wie.details},
        )
    except Exception as e:
        logger.exception(f"Unhandled error in workflow run endpoint: {e}")
        return RunWorkflowResponse(
            success=False,
            error={
                "code": "INTERNAL_WORKFLOW_ERROR",
                "message": str(e),
                "is_retryable": False,
            },
        )


@router.get(
    "/analytics/summary",
    response_model=WorkflowAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Get Workflow Analytics Summary",
    description="Calculates aggregated agent workflow execution metrics strictly isolated by organization.",
)
async def get_workflow_analytics_endpoint(
    organization_id: str = Query(..., description="Target organization UUID for tenant boundary validation"),
    from_date: Optional[str] = Query(None, description="Optional start datetime ISO filter"),
    to_date: Optional[str] = Query(None, description="Optional end datetime ISO filter"),
    service: WorkflowStatusService = Depends(get_workflow_status_service),
) -> WorkflowAnalyticsResponse:
    try:
        analytics = await service.get_workflow_analytics(
            organization_id=organization_id,
            from_date=from_date,
            to_date=to_date,
        )
        return WorkflowAnalyticsResponse(success=True, data=analytics)
    except Exception as e:
        logger.exception(f"Error fetching workflow analytics for org '{organization_id}': {e}")
        return WorkflowAnalyticsResponse(
            success=False,
            error={
                "code": "INTERNAL_ANALYTICS_ERROR",
                "message": str(e),
            },
        )


@router.get(
    "/runs",
    response_model=WorkflowRunListResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="List Organization Workflow Runs",
    description="Retrieves a paginated list of agent workflow runs scoped strictly to the organization.",
)
async def list_workflow_runs_endpoint(
    organization_id: str = Query(..., description="Target organization UUID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by run status"),
    workflow_name: Optional[str] = Query(None, description="Filter by workflow name"),
    search: Optional[str] = Query(None, description="Search term in intent, tool, or thread"),
    from_date: Optional[str] = Query(None, description="Start date ISO filter"),
    to_date: Optional[str] = Query(None, description="End date ISO filter"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    service: WorkflowStatusService = Depends(get_workflow_status_service),
) -> WorkflowRunListResponse:
    try:
        data = await service.list_workflow_runs(
            organization_id=organization_id,
            status=status_filter,
            workflow_name=workflow_name,
            search=search,
            from_date=from_date,
            to_date=to_date,
            page=page,
            limit=limit,
        )
        return WorkflowRunListResponse(success=True, data=data)
    except Exception as e:
        logger.exception(f"Error listing workflow runs for org '{organization_id}': {e}")
        return WorkflowRunListResponse(
            success=False,
            error={
                "code": "INTERNAL_WORKFLOW_LIST_ERROR",
                "message": str(e),
            },
        )


@router.get(
    "/{run_id}",
    response_model=WorkflowStatusResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Get Workflow Run Status",
    description="Inspects the execution outcome and lifecycle state of a persistent workflow run.",
)
async def get_workflow_status_endpoint(
    run_id: str,
    organization_id: str = Query(..., description="Target organization UUID for tenant boundary validation"),
    service: WorkflowStatusService = Depends(get_workflow_status_service),
) -> WorkflowStatusResponse:
    try:
        run_data = await service.get_run_status(organization_id=organization_id, run_id=run_id)
        return WorkflowStatusResponse(success=True, data=run_data)
    except WorkflowRunNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WORKFLOW_RUN_NOT_FOUND", "message": f"Run '{run_id}' not found in organization"},
        )
    except Exception as e:
        logger.exception(f"Error fetching workflow status for run '{run_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_WORKFLOW_ERROR", "message": str(e)},
        )


@router.post(
    "/resume",
    response_model=ResumeWorkflowResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(verify_internal_service_token)],
    summary="Resume Interrupted Workflow",
    description="Resumes a human-in-the-loop suspended LangGraph thread with approval or rejection decision.",
)
async def resume_workflow_endpoint(
    request: ResumeWorkflowRequest,
    service: WorkflowExecutionService = Depends(get_workflow_execution_service),
) -> ResumeWorkflowResponse:
    try:
        run_data = await service.resume_workflow(request)
        return ResumeWorkflowResponse(success=True, data=run_data)
    except Exception as e:
        logger.exception(f"Unhandled error in workflow resume endpoint: {e}")
        return ResumeWorkflowResponse(
            success=False,
            error={
                "code": "INTERNAL_RESUME_ERROR",
                "message": str(e),
            },
        )
