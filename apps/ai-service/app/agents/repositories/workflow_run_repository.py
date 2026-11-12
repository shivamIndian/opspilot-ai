"""Repository for managing AgentWorkflowRun entities in PostgreSQL 'ai' schema."""

import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy import select, update, func, desc, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.models import AgentWorkflowRun


class WorkflowRunRepository:
    """Encapsulates persistent database operations on ai.agent_workflow_runs."""

    @staticmethod
    async def create_run(
        session: AsyncSession,
        thread_id: str,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        request_id: str,
        workflow_name: str = "opspilot_support_workflow",
        workflow_version: str = "v1.0",
        status: str = "queued",
    ) -> AgentWorkflowRun:
        """Persists a new workflow run record."""
        run = AgentWorkflowRun(
            thread_id=thread_id,
            organization_id=organization_id,
            user_id=user_id,
            request_id=request_id,
            workflow_name=workflow_name,
            workflow_version=workflow_version,
            status=status,
            started_at=datetime.now(timezone.utc),
        )
        session.add(run)
        await session.commit()
        await session.refresh(run)
        return run

    @staticmethod
    async def get_by_id(
        session: AsyncSession,
        organization_id: uuid.UUID,
        run_id: uuid.UUID,
    ) -> Optional[AgentWorkflowRun]:
        """Retrieves a workflow run enforcing strict organization tenancy."""
        stmt = select(AgentWorkflowRun).where(
            AgentWorkflowRun.id == run_id,
            AgentWorkflowRun.organization_id == organization_id,
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def get_by_request_id(
        session: AsyncSession,
        organization_id: uuid.UUID,
        request_id: str,
    ) -> Optional[AgentWorkflowRun]:
        """Looks up an existing run by idempotency request_id and organization."""
        stmt = select(AgentWorkflowRun).where(
            AgentWorkflowRun.organization_id == organization_id,
            AgentWorkflowRun.request_id == request_id,
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def update_run_outcome(
        session: AsyncSession,
        run_id: uuid.UUID,
        status: str,
        intent: Optional[str] = None,
        selected_tool: Optional[str] = None,
        requires_approval: bool = False,
        proposal_id: Optional[uuid.UUID] = None,
        error_code: Optional[str] = None,
        current_step: Optional[str] = None,
        total_steps: Optional[int] = None,
        completed_steps_count: Optional[int] = None,
        tool_call_count: Optional[int] = None,
        replan_count: Optional[int] = None,
        execution_summary: Optional[str] = None,
        final_response: Optional[str] = None,
        citations: Optional[List[Dict[str, Any]]] = None,
        action_proposals: Optional[List[Dict[str, Any]]] = None,
        duration_ms: Optional[float] = None,
    ) -> None:
        """Updates run outcome fields and completion timestamp."""
        update_vals: Dict[str, Any] = {
            "status": status,
            "completed_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        if intent is not None:
            update_vals["intent"] = intent
        if selected_tool is not None:
            update_vals["selected_tool"] = selected_tool
        if requires_approval is not None:
            update_vals["requires_approval"] = requires_approval
        if proposal_id is not None:
            update_vals["proposal_id"] = proposal_id
        if error_code is not None:
            update_vals["error_code"] = error_code
        if current_step is not None:
            update_vals["current_step"] = current_step
        if total_steps is not None:
            update_vals["total_steps"] = total_steps
        if completed_steps_count is not None:
            update_vals["completed_steps_count"] = completed_steps_count
        if tool_call_count is not None:
            update_vals["tool_call_count"] = tool_call_count
        if replan_count is not None:
            update_vals["replan_count"] = replan_count
        if execution_summary is not None:
            update_vals["execution_summary"] = execution_summary
        if final_response is not None:
            update_vals["final_response"] = final_response
        if citations is not None:
            update_vals["citations"] = citations
        if action_proposals is not None:
            update_vals["action_proposals"] = action_proposals
        if duration_ms is not None:
            update_vals["duration_ms"] = duration_ms

        stmt = (
            update(AgentWorkflowRun)
            .where(AgentWorkflowRun.id == run_id)
            .values(**update_vals)
        )
        await session.execute(stmt)
        await session.commit()

    @staticmethod
    async def get_workflow_analytics(
        session: AsyncSession,
        organization_id: uuid.UUID,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Calculates workflow execution metrics within tenant boundaries."""
        conditions = [AgentWorkflowRun.organization_id == organization_id]
        if from_date:
            conditions.append(AgentWorkflowRun.created_at >= from_date)
        if to_date:
            conditions.append(AgentWorkflowRun.created_at <= to_date)

        stmt = select(
            func.count(AgentWorkflowRun.id).label("total_runs"),
            func.coalesce(func.sum(case((AgentWorkflowRun.status == "completed", 1), else_=0)), 0).label("successful_runs"),
            func.coalesce(func.sum(case((AgentWorkflowRun.status == "failed", 1), else_=0)), 0).label("failed_runs"),
            func.coalesce(func.sum(case((AgentWorkflowRun.status == "waiting_approval", 1), else_=0)), 0).label("waiting_approval_runs"),
            func.coalesce(func.sum(case((AgentWorkflowRun.status.in_(["running", "queued"]), 1), else_=0)), 0).label("running_runs"),
            func.avg(AgentWorkflowRun.duration_ms).filter(AgentWorkflowRun.duration_ms.isnot(None)).label("avg_duration_ms"),
            func.coalesce(func.sum(AgentWorkflowRun.tool_call_count), 0).label("total_tool_calls"),
        ).where(*conditions)

        res = await session.execute(stmt)
        row = res.one_or_none()

        total_runs = int(row.total_runs) if row and row.total_runs else 0
        successful_runs = int(row.successful_runs) if row and row.successful_runs else 0
        failed_runs = int(row.failed_runs) if row and row.failed_runs else 0
        waiting_approval_runs = int(row.waiting_approval_runs) if row and row.waiting_approval_runs else 0
        running_runs = int(row.running_runs) if row and row.running_runs else 0
        avg_duration_ms = round(float(row.avg_duration_ms), 2) if row and row.avg_duration_ms is not None else 0.0
        total_tool_calls = int(row.total_tool_calls) if row and row.total_tool_calls else 0
        success_rate = round((successful_runs / total_runs) * 100, 1) if total_runs > 0 else 0.0

        recent_stmt = (
            select(AgentWorkflowRun)
            .where(*conditions)
            .order_by(desc(AgentWorkflowRun.created_at))
            .limit(5)
        )
        recent_res = await session.execute(recent_stmt)
        recent_runs_list = []
        for r in recent_res.scalars().all():
            recent_runs_list.append({
                "id": str(r.id),
                "thread_id": r.thread_id,
                "status": r.status,
                "intent": r.intent,
                "selected_tool": r.selected_tool,
                "duration_ms": r.duration_ms,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })

        return {
            "total_runs": total_runs,
            "successful_runs": successful_runs,
            "failed_runs": failed_runs,
            "waiting_approval_runs": waiting_approval_runs,
            "running_runs": running_runs,
            "success_rate": success_rate,
            "avg_duration_ms": avg_duration_ms,
            "total_tool_calls": total_tool_calls,
            "recent_runs": recent_runs_list,
        }

    @staticmethod
    async def list_runs(
        session: AsyncSession,
        organization_id: uuid.UUID,
        status: Optional[str] = None,
        workflow_name: Optional[str] = None,
        search: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """Lists runs with pagination and tenant isolation."""
        conditions = [AgentWorkflowRun.organization_id == organization_id]
        if status:
            conditions.append(AgentWorkflowRun.status == status)
        if workflow_name:
            conditions.append(AgentWorkflowRun.workflow_name == workflow_name)
        if from_date:
            conditions.append(AgentWorkflowRun.created_at >= from_date)
        if to_date:
            conditions.append(AgentWorkflowRun.created_at <= to_date)
        if search:
            search_pattern = f"%{search}%"
            conditions.append(
                (AgentWorkflowRun.intent.ilike(search_pattern))
                | (AgentWorkflowRun.selected_tool.ilike(search_pattern))
                | (AgentWorkflowRun.thread_id.ilike(search_pattern))
            )

        # Count total
        count_stmt = select(func.count(AgentWorkflowRun.id)).where(*conditions)
        total_res = await session.execute(count_stmt)
        total = total_res.scalar_one() or 0

        # Query page
        offset = max(0, (page - 1) * limit)
        stmt = (
            select(AgentWorkflowRun)
            .where(*conditions)
            .order_by(desc(AgentWorkflowRun.created_at))
            .offset(offset)
            .limit(limit)
        )
        runs_res = await session.execute(stmt)
        items = runs_res.scalars().all()

        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
        }
