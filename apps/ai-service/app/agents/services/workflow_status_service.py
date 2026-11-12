"""Service for retrieving workflow run status and telemetry records."""

import logging
import uuid
from typing import Optional
from datetime import datetime

from app.database.session import AsyncSessionLocal
from app.agents.schemas import (
    WorkflowRunData,
    WorkflowAnalyticsSummary,
    WorkflowRunListItem,
    WorkflowRunListResult,
)
from app.agents.repositories.workflow_run_repository import WorkflowRunRepository
from app.agents.exceptions import WorkflowRunNotFoundError

logger = logging.getLogger(__name__)


class WorkflowStatusService:
    """Provides secure, tenant-isolated workflow run inspection."""

    async def get_run_status(self, organization_id: str, run_id: str) -> WorkflowRunData:
        """Retrieves safe workflow run details, verifying tenant boundary."""
        org_uuid = uuid.UUID(organization_id)
        run_uuid = uuid.UUID(run_id)

        async with AsyncSessionLocal() as session:
            run = await WorkflowRunRepository.get_by_id(session, org_uuid, run_uuid)
            if not run:
                raise WorkflowRunNotFoundError(run_id=run_id)

            final_resp = getattr(run, "final_response", None)
            exec_sum = getattr(run, "execution_summary", None)
            total_st = getattr(run, "total_steps", 0)
            tc_count = getattr(run, "tool_call_count", 0)
            rc_count = getattr(run, "replan_count", 0)
            cites = getattr(run, "citations", [])
            proposals = getattr(run, "action_proposals", [])
            dur_ms = getattr(run, "duration_ms", None)

            return WorkflowRunData(
                run_id=str(run.id),
                thread_id=run.thread_id,
                organization_id=str(run.organization_id),
                status=run.status,
                intent=run.intent,
                selected_tool=run.selected_tool,
                requires_approval=run.requires_approval,
                proposal_id=str(run.proposal_id) if run.proposal_id else None,
                error_code=run.error_code,
                answer=final_resp if isinstance(final_resp, str) else None,
                citations=cites if isinstance(cites, list) else [],
                duration_ms=dur_ms if isinstance(dur_ms, (int, float)) else None,
                total_steps=total_st if isinstance(total_st, int) else 0,
                tool_call_count=tc_count if isinstance(tc_count, int) else 0,
                replan_count=rc_count if isinstance(rc_count, int) else 0,
                action_proposals=proposals if isinstance(proposals, list) else [],
                execution_summary=exec_sum if isinstance(exec_sum, str) else None,
            )

    async def get_workflow_analytics(
        self,
        organization_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> WorkflowAnalyticsSummary:
        """Retrieves aggregated workflow metrics strictly scoped to the tenant organization."""
        org_uuid = uuid.UUID(organization_id)
        parsed_from: Optional[datetime] = None
        parsed_to: Optional[datetime] = None

        if from_date:
            try:
                parsed_from = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
            except Exception as e:
                logger.warning(f"Failed to parse from_date '{from_date}': {e}")
        if to_date:
            try:
                parsed_to = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
            except Exception as e:
                logger.warning(f"Failed to parse to_date '{to_date}': {e}")

        async with AsyncSessionLocal() as session:
            raw_metrics = await WorkflowRunRepository.get_workflow_analytics(
                session=session,
                organization_id=org_uuid,
                from_date=parsed_from,
                to_date=parsed_to,
            )
            return WorkflowAnalyticsSummary(**raw_metrics)

    async def list_workflow_runs(
        self,
        organization_id: str,
        status: Optional[str] = None,
        workflow_name: Optional[str] = None,
        search: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> WorkflowRunListResult:
        """Retrieves paginated list of workflow runs scoped to the organization."""
        org_uuid = uuid.UUID(organization_id)
        parsed_from: Optional[datetime] = None
        parsed_to: Optional[datetime] = None

        if from_date:
            try:
                parsed_from = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
            except Exception as e:
                logger.warning(f"Failed to parse from_date '{from_date}': {e}")
        if to_date:
            try:
                parsed_to = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
            except Exception as e:
                logger.warning(f"Failed to parse to_date '{to_date}': {e}")

        async with AsyncSessionLocal() as session:
            res = await WorkflowRunRepository.list_runs(
                session=session,
                organization_id=org_uuid,
                status=status,
                workflow_name=workflow_name,
                search=search,
                from_date=parsed_from,
                to_date=parsed_to,
                page=page,
                limit=limit,
            )

            items = []
            for r in res["items"]:
                items.append(
                    WorkflowRunListItem(
                        id=str(r.id),
                        run_id=str(r.id),
                        thread_id=r.thread_id,
                        organization_id=str(r.organization_id),
                        user_id=str(r.user_id),
                        workflow_name=r.workflow_name,
                        workflow_version=r.workflow_version,
                        status=r.status,
                        intent=r.intent,
                        selected_tool=r.selected_tool,
                        requires_approval=r.requires_approval,
                        proposal_id=str(r.proposal_id) if r.proposal_id else None,
                        error_code=r.error_code,
                        started_at=r.started_at.isoformat() if r.started_at else None,
                        completed_at=r.completed_at.isoformat() if r.completed_at else None,
                        duration_ms=r.duration_ms,
                        total_steps=r.total_steps or 0,
                        completed_steps_count=r.completed_steps_count or 0,
                        tool_call_count=r.tool_call_count or 0,
                        created_at=r.created_at.isoformat() if r.created_at else None,
                    )
                )

            return WorkflowRunListResult(
                items=items,
                total=res["total"],
                page=res["page"],
                limit=res["limit"],
                total_pages=res["total_pages"],
            )


_status_service_instance: Optional[WorkflowStatusService] = None


def get_workflow_status_service() -> WorkflowStatusService:
    global _status_service_instance
    if _status_service_instance is None:
        _status_service_instance = WorkflowStatusService()
    return _status_service_instance
