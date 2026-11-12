"""Orchestration service for executing and checkpointing LangGraph workflow runs."""

import asyncio
import logging
import time
import uuid
from typing import Optional, Dict, Any

from app.database.session import AsyncSessionLocal
from app.agents.schemas import RunWorkflowRequest, WorkflowRunData, ResumeWorkflowRequest
from app.agents.state import OpsPilotWorkflowState
from app.agents.context import WorkflowContext
from app.agents.persistence import get_workflow_checkpointer
from app.agents.repositories.workflow_run_repository import WorkflowRunRepository
from app.agents.exceptions import (
    WorkflowExecutionTimeoutError,
    WorkflowError,
)

logger = logging.getLogger(__name__)


class WorkflowExecutionService:
    """Manages the full lifecycle of a LangGraph agent workflow run."""

    async def execute_workflow(self, request: RunWorkflowRequest) -> WorkflowRunData:
        """Executes a stateful multi-step workflow run with persistence and audit tracking."""
        start_time = time.perf_counter()
        run_uuid = uuid.uuid4()
        run_id = str(run_uuid)
        thread_id = request.thread_id or str(uuid.uuid4())
        org_uuid = uuid.UUID(request.organization_id)
        user_uuid = uuid.UUID(request.authenticated_user_id)

        # 1. Check idempotency & record run in database
        async with AsyncSessionLocal() as session:
            existing_run = await WorkflowRunRepository.get_by_request_id(
                session, org_uuid, request.request_id
            )
            if existing_run:
                logger.info(
                    f"[WorkflowExecution] Request '{request.request_id}' already executed as run '{existing_run.id}'."
                )
                return WorkflowRunData(
                    run_id=str(existing_run.id),
                    thread_id=existing_run.thread_id,
                    organization_id=str(existing_run.organization_id),
                    status=existing_run.status,
                    intent=existing_run.intent,
                    selected_tool=existing_run.selected_tool,
                    requires_approval=existing_run.requires_approval,
                    proposal_id=str(existing_run.proposal_id) if existing_run.proposal_id else None,
                    error_code=existing_run.error_code,
                    total_steps=existing_run.total_steps or 0,
                    completed_steps=[],
                    tool_call_count=existing_run.tool_call_count or 0,
                    replan_count=existing_run.replan_count or 0,
                    action_proposals=existing_run.action_proposals or [],
                    execution_summary=existing_run.execution_summary,
                )

            # Create initial run record
            await WorkflowRunRepository.create_run(
                session=session,
                thread_id=thread_id,
                organization_id=org_uuid,
                user_id=user_uuid,
                request_id=request.request_id,
                workflow_name="opspilot_support_workflow",
                workflow_version=request.workflow_version,
                status="running",
            )

        # 2. Build trusted runtime context (kept separate from graph state)
        context = WorkflowContext(
            authenticated_user_id=request.authenticated_user_id,
            organization_id=request.organization_id,
            request_id=request.request_id,
            delegated_authorization_token=request.delegated_authorization_token,
            permitted_scopes=request.permitted_scopes,
            organization_role=request.organization_role,
            correlation_id=request.correlation_id,
            workflow_version=request.workflow_version,
        )

        # 3. Retrieve persistent user memory context (Module 15)
        from app.memory.integration.langgraph_memory_adapter import LangGraphMemoryAdapter
        memory_data = await LangGraphMemoryAdapter.retrieve_and_format_memory(
            organization_id_str=request.organization_id,
            user_id_str=request.authenticated_user_id,
            query=request.query,
        )

        # 4. Construct initial graph state
        initial_state: OpsPilotWorkflowState = {
            "request_id": request.request_id,
            "run_id": run_id,
            "thread_id": thread_id,
            "organization_id": request.organization_id,
            "user_id": request.authenticated_user_id,
            "user_memories": memory_data.get("user_memories", []),
            "user_memory_context": memory_data.get("user_memory_context"),
            "memory_proposals": [],
            "workflow_status": "running",
            "current_node": "START",
            "original_query": request.query,
            "normalized_query": request.query,
            "insufficient_evidence": False,
            "requires_approval": False,
            "current_step_index": 0,
            "total_steps": 0,
            "completed_steps": [],
            "failed_steps": [],
            "tool_call_count": 0,
            "replan_count": 0,
            "tool_results": {},
            "pending_proposal_ids": [],
            "completed_proposal_ids": [],
            "retrieved_sources": [],
            "citation_data": [],
        }

        # 5. Compile workflow with active checkpointer
        from app.agents.graphs.opspilot_graph import build_opspilot_workflow
        checkpointer = get_workflow_checkpointer()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        runnable_config = {
            "configurable": {
                "thread_id": thread_id,
                "context": context,
            }
        }

        # 5. Execute workflow with timeout protection
        final_state: Dict[str, Any] = {}
        status = "completed"
        error_code = None

        try:
            final_state = await asyncio.wait_for(
                graph.ainvoke(initial_state, config=runnable_config),
                timeout=60.0,
            )
            status = final_state.get("workflow_status", "completed")
            error_code = final_state.get("error_code")

        except asyncio.TimeoutError:
            status = "failed"
            error_code = "WORKFLOW_EXECUTION_TIMEOUT"
            logger.error(f"[WorkflowExecution] Run '{run_id}' timed out after 60s")
            final_state = {
                "generated_answer": "Workflow execution timed out. Please retry with a more specific query.",
                "workflow_status": "failed",
                "error_code": error_code,
            }

        except Exception as e:
            status = "failed"
            error_code = getattr(e, "error_code", "WORKFLOW_EXECUTION_FAILED")
            logger.error(f"[WorkflowExecution] Unhandled error executing run '{run_id}': {e}", exc_info=True)
            final_state = {
                "generated_answer": f"Workflow failed during execution: {str(e)}",
                "workflow_status": "failed",
                "error_code": error_code,
            }

        duration_ms = (time.perf_counter() - start_time) * 1000.0

        # 6. Persist final outcome in database
        prop_id_str = final_state.get("proposal_id")
        prop_uuid = uuid.UUID(prop_id_str) if prop_id_str else None
        action_proposals = (
            [final_state.get("action_proposal")]
            if final_state.get("action_proposal")
            else []
        )

        async with AsyncSessionLocal() as session:
            await WorkflowRunRepository.update_run_outcome(
                session=session,
                run_id=run_uuid,
                status=status,
                intent=final_state.get("intent"),
                selected_tool=final_state.get("selected_tool"),
                requires_approval=final_state.get("requires_approval", False),
                proposal_id=prop_uuid,
                error_code=error_code,
                current_step=str(final_state.get("current_step_index", 0)),
                total_steps=final_state.get("total_steps", 0),
                completed_steps_count=len(final_state.get("completed_steps") or []),
                tool_call_count=final_state.get("tool_call_count", 0),
                replan_count=final_state.get("replan_count", 0),
                execution_summary=final_state.get("execution_summary"),
                final_response=final_state.get("generated_answer"),
                citations=final_state.get("citation_data") or [],
                action_proposals=action_proposals,
                duration_ms=duration_ms,
            )

        # 7. Extract candidate memory proposals if consent enabled (Module 15)
        memory_proposals = final_state.get("memory_proposals") or []
        if not memory_proposals and status == "completed" and request.authenticated_user_id:
            try:
                transcript_msgs = [
                    {"role": "user", "content": request.query},
                    {"role": "assistant", "content": final_state.get("generated_answer") or ""},
                ]
                memory_proposals = await LangGraphMemoryAdapter.extract_candidate_proposals(
                    organization_id_str=request.organization_id,
                    user_id_str=request.authenticated_user_id,
                    conversation_id=thread_id,
                    messages=transcript_msgs,
                )
            except Exception as ex_err:
                logger.debug("Candidate memory extraction non-fatal error: %s", ex_err)

        # 8. Package standardized response data
        return WorkflowRunData(
            run_id=run_id,
            thread_id=thread_id,
            organization_id=request.organization_id,
            status=status,
            intent=final_state.get("intent"),
            selected_tool=final_state.get("selected_tool"),
            answer=final_state.get("generated_answer"),
            citations=final_state.get("citation_data") or [],
            insufficient_evidence=final_state.get("insufficient_evidence", False),
            requires_approval=final_state.get("requires_approval", False),
            proposal=final_state.get("action_proposal") or final_state.get("proposed_action"),
            proposal_id=prop_id_str,
            error_code=error_code,
            duration_ms=duration_ms,
            total_steps=final_state.get("total_steps", 0),
            completed_steps=final_state.get("completed_steps") or [],
            tool_call_count=final_state.get("tool_call_count", 0),
            replan_count=final_state.get("replan_count", 0),
            action_proposals=action_proposals,
            memory_proposals=memory_proposals,
            execution_summary=final_state.get("execution_summary"),
        )

    async def resume_workflow(self, request: ResumeWorkflowRequest) -> WorkflowRunData:
        """Resumes an interrupted LangGraph workflow run by delivering human approval/rejection Command."""
        start_time = time.perf_counter()
        thread_id = request.thread_id
        checkpointer = get_workflow_checkpointer()

        from app.agents.graphs.opspilot_graph import build_opspilot_workflow
        from langgraph.types import Command

        graph = build_opspilot_workflow(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": thread_id}}

        resume_command = Command(
            resume={
                "decision": request.decision,
                "proposal_id": request.proposal_id,
                "decided_by": request.decided_by,
                "decision_reason": request.decision_reason,
                "execution_result": request.execution_result,
            }
        )

        logger.info(
            f"[WorkflowExecution] Resuming thread '{thread_id}' with decision '{request.decision}' for proposal '{request.proposal_id}'"
        )

        try:
            final_state = await graph.ainvoke(resume_command, config=config)
            status = final_state.get("workflow_status", "completed" if request.decision == "approved" else "rejected")
            error_code = final_state.get("error_code")
        except Exception as e:
            logger.error(f"[WorkflowExecution] Error resuming workflow thread '{thread_id}': {e}", exc_info=True)
            status = "failed"
            error_code = "WORKFLOW_RESUME_ERROR"
            final_state = {
                "generated_answer": f"Workflow resumption failed: {str(e)}",
                "workflow_status": "failed",
                "error_code": error_code,
            }

        duration_ms = (time.perf_counter() - start_time) * 1000.0

        run_id_val = final_state.get("run_id")
        if run_id_val:
            try:
                run_uuid = uuid.UUID(run_id_val)
                async with AsyncSessionLocal() as session:
                    await WorkflowRunRepository.update_run_outcome(
                        session=session,
                        run_id=run_uuid,
                        status=status,
                        intent=final_state.get("intent"),
                        selected_tool=final_state.get("selected_tool"),
                        requires_approval=False,
                        proposal_id=None,
                        error_code=error_code,
                        current_step=str(final_state.get("current_step_index", 0)),
                        total_steps=final_state.get("total_steps", 0),
                        completed_steps_count=len(final_state.get("completed_steps") or []),
                        tool_call_count=final_state.get("tool_call_count", 0),
                        replan_count=final_state.get("replan_count", 0),
                        execution_summary=final_state.get("execution_summary"),
                        final_response=final_state.get("generated_answer"),
                        citations=final_state.get("citation_data") or [],
                        action_proposals=[],
                        duration_ms=duration_ms,
                    )
            except Exception as dbe:
                logger.warning(f"[WorkflowExecution] Failed to update DB on resume: {dbe}")

        return WorkflowRunData(
            run_id=run_id_val or f"resumed-{thread_id}",
            thread_id=thread_id,
            organization_id=final_state.get("organization_id", "default-org"),
            status=status,
            intent=final_state.get("intent"),
            selected_tool=final_state.get("selected_tool"),
            answer=final_state.get("generated_answer"),
            citations=final_state.get("citation_data") or [],
            insufficient_evidence=final_state.get("insufficient_evidence", False),
            requires_approval=False,
            proposal=None,
            proposal_id=None,
            error_code=error_code,
            duration_ms=duration_ms,
            total_steps=final_state.get("total_steps", 0),
            completed_steps=final_state.get("completed_steps") or [],
            tool_call_count=final_state.get("tool_call_count", 0),
            replan_count=final_state.get("replan_count", 0),
            action_proposals=[],
            execution_summary=final_state.get("execution_summary"),
        )


_service_instance: Optional[WorkflowExecutionService] = None


def get_workflow_execution_service() -> WorkflowExecutionService:
    global _service_instance
    if _service_instance is None:
        _service_instance = WorkflowExecutionService()
    return _service_instance
