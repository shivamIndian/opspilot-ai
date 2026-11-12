"""Dedicated test suite for Module 13: Multi-Step Agent Execution and Adaptive Replanning."""

import pytest
import uuid
from unittest.mock import AsyncMock, patch
from langgraph.checkpoint.memory import MemorySaver

from app.agents.constants import (
    MAX_PLAN_STEPS,
    MAX_TOOL_CALLS_PER_RUN,
    MAX_REPLANNING_ATTEMPTS,
    APPROVED_TOOL_NAMES,
)
from app.agents.context import WorkflowContext
from app.agents.exceptions import (
    PlanValidationError,
    PlanDependencyCycleError,
    PlanUnknownDependencyError,
    PlanStepLimitExceededError,
)
from app.agents.graphs.opspilot_graph import build_opspilot_workflow
from app.agents.schemas import PlanStep, MultiStepExecutionPlan, StepProgressDecision
from app.agents.services.plan_validation_service import plan_validation_service
from app.agents.services.progress_service import progress_service
from app.agents.state import OpsPilotWorkflowState


from app.llm.providers.mock_provider import MockLLMProvider
from app.llm.provider_factory import set_llm_provider
from app.agents.persistence import set_workflow_checkpointer
from pydantic import ValidationError


@pytest.fixture(autouse=True)
def setup_test_providers():
    """Ensures MockLLMProvider and MemorySaver are used across all multi-step workflow tests."""
    mock_llm = MockLLMProvider()
    set_llm_provider(mock_llm)
    memory_saver = MemorySaver()
    set_workflow_checkpointer(memory_saver)
    return mock_llm


@pytest.fixture
def test_workflow_context():
    return WorkflowContext(
        authenticated_user_id="user-ms-1234-5678-abcd",
        organization_id="org-ms-8765-4321-dcba",
        request_id="req-ms-test-001",
        delegated_authorization_token="bearer-token-val",
        permitted_scopes=[
            "tools:knowledge:read",
            "tools:tickets:read",
            "tools:tickets:write",
            "tools:users:read",
            "tools:history:read",
        ],
        organization_role="admin",
        correlation_id="corr-ms-01",
        workflow_version="v1.0",
    )


class TestPlanValidationUnit:
    """Unit tests for DAG dependency validation, bounds, and schema checking in PlanValidationService."""

    def test_valid_plan_passes_validation(self):
        plan = MultiStepExecutionPlan(
            objective="Inspect user and find support tickets",
            steps=[
                PlanStep(
                    step_id="step_1",
                    tool_name="search_user_information",
                    action_type="read",
                    arguments={"name": "Alice"},
                    depends_on=[],
                    expected_output="User ID and details",
                ),
                PlanStep(
                    step_id="step_2",
                    tool_name="summarize_support_history",
                    action_type="read",
                    arguments={"limit": 5},
                    depends_on=["step_1"],
                    expected_output="Support tickets for user",
                ),
            ],
        )
        # Should not raise
        plan_validation_service.validate_plan(plan)

    def test_plan_exceeding_max_steps_raises(self):
        steps = [
            PlanStep(
                step_id=f"step_{i}",
                tool_name="summarize_support_history",
                action_type="read",
                arguments={"limit": i + 1},
                depends_on=[f"step_{i-1}"] if i > 0 else [],
                expected_output=f"Output {i}",
            )
            for i in range(MAX_PLAN_STEPS + 1)
        ]
        with pytest.raises(ValidationError):
            MultiStepExecutionPlan(objective="Overly long plan", steps=steps)

        plan_constructed = MultiStepExecutionPlan.model_construct(objective="Overly long plan", steps=steps)
        with pytest.raises(PlanStepLimitExceededError):
            plan_validation_service.validate_plan(plan_constructed)

    def test_dependency_cycle_detected(self):
        plan = MultiStepExecutionPlan(
            objective="Cyclic plan",
            steps=[
                PlanStep(
                    step_id="step_1",
                    tool_name="search_knowledge_base",
                    action_type="read",
                    arguments={"query": "test"},
                    depends_on=["step_2"],  # Depends on step_2
                    expected_output="Output 1",
                ),
                PlanStep(
                    step_id="step_2",
                    tool_name="summarize_support_history",
                    action_type="read",
                    arguments={"limit": 5},
                    depends_on=["step_1"],  # Depends on step_1 -> Cycle!
                    expected_output="Output 2",
                ),
            ],
        )
        with pytest.raises(PlanDependencyCycleError) as exc_info:
            plan_validation_service.validate_plan(plan)
        assert "cyclic dependency" in str(exc_info.value).lower()

    def test_unknown_dependency_detected(self):
        plan = MultiStepExecutionPlan(
            objective="Unknown dep plan",
            steps=[
                PlanStep(
                    step_id="step_1",
                    tool_name="search_knowledge_base",
                    action_type="read",
                    arguments={"query": "test"},
                    depends_on=["step_nonexistent"],
                    expected_output="Output 1",
                )
            ],
        )
        with pytest.raises(PlanUnknownDependencyError) as exc_info:
            plan_validation_service.validate_plan(plan)
        assert "references unknown dependency 'step_nonexistent'" in str(exc_info.value)

    def test_forward_dependency_detected(self):
        plan = MultiStepExecutionPlan(
            objective="Forward dep plan",
            steps=[
                PlanStep(
                    step_id="step_1",
                    tool_name="search_knowledge_base",
                    action_type="read",
                    arguments={"query": "test"},
                    depends_on=["step_2"],  # Forward dependency!
                    expected_output="Output 1",
                ),
                PlanStep(
                    step_id="step_2",
                    tool_name="summarize_support_history",
                    action_type="read",
                    arguments={"limit": 5},
                    depends_on=[],
                    expected_output="Output 2",
                ),
            ],
        )
        with pytest.raises(PlanDependencyCycleError) as exc_info:
            plan_validation_service.validate_plan(plan)
        assert "forward or cyclic dependency" in str(exc_info.value)

    def test_unregistered_tool_rejected(self):
        plan = MultiStepExecutionPlan(
            objective="Hacking tool plan",
            steps=[
                PlanStep(
                    step_id="step_1",
                    tool_name="drop_database_tables",
                    action_type="read",
                    arguments={},
                    depends_on=[],
                    expected_output="Unauthorized action",
                )
            ],
        )
        with pytest.raises(PlanValidationError) as exc_info:
            plan_validation_service.validate_plan(plan)
        assert "not an approved registered tool" in str(exc_info.value)

    def test_invalid_tool_arguments_schema_rejected(self):
        plan = MultiStepExecutionPlan(
            objective="Bad arguments plan",
            steps=[
                PlanStep(
                    step_id="step_1",
                    tool_name="search_knowledge_base",
                    action_type="read",
                    arguments={"query": ""},  # Query must not be empty (min_length=1)
                    depends_on=[],
                    expected_output="Knowledge",
                )
            ],
        )
        with pytest.raises(PlanValidationError) as exc_info:
            plan_validation_service.validate_plan(plan)
        assert "Invalid arguments for tool 'search_knowledge_base'" in str(exc_info.value)


class TestProgressServiceUnit:
    """Unit tests for ProgressService step transitions, replanning triggers, and limit checking."""

    def test_step_progress_advances_when_steps_remain(self):
        decision = progress_service.evaluate_step_outcome(
            current_step_index=0,
            total_steps=3,
            tool_call_count=1,
            replan_count=0,
            completed_steps=["step_1"],
            failed_steps=[],
            tool_results={"step_1": {"data": "ok"}},
            plan_steps=[{"step_id": "step_1"}, {"step_id": "step_2"}, {"step_id": "step_3"}],
        )
        assert decision.decision == StepProgressDecision.NEXT_STEP
        assert "Advancing to step" in decision.rationale

    def test_step_progress_finalizes_when_all_steps_complete(self):
        decision = progress_service.evaluate_step_outcome(
            current_step_index=2,
            total_steps=3,
            tool_call_count=3,
            replan_count=0,
            completed_steps=["step_1", "step_2", "step_3"],
            failed_steps=[],
            tool_results={"step_3": {"data": "ok"}},
            plan_steps=[{"step_id": "step_1"}, {"step_id": "step_2"}, {"step_id": "step_3"}],
        )
        assert decision.decision == StepProgressDecision.FINALIZE

    def test_step_progress_triggers_replan_on_recoverable_failure(self):
        decision = progress_service.evaluate_step_outcome(
            current_step_index=0,
            total_steps=2,
            tool_call_count=1,
            replan_count=0,
            completed_steps=[],
            failed_steps=["step_1"],
            tool_results={"step_1": {"failed": True, "error": "upstream network timeout"}},
            plan_steps=[{"step_id": "step_1"}, {"step_id": "step_2"}],
        )
        assert decision.decision == StepProgressDecision.REPLAN
        assert "encountered recoverable failure" in decision.rationale

    def test_step_progress_halts_when_replan_limit_exceeded(self):
        decision = progress_service.evaluate_step_outcome(
            current_step_index=0,
            total_steps=2,
            tool_call_count=3,
            replan_count=MAX_REPLANNING_ATTEMPTS,  # Already at limit 2
            completed_steps=[],
            failed_steps=["step_1"],
            tool_results={"step_1": {"failed": True, "error": "fatal failure"}},
            plan_steps=[{"step_id": "step_1"}, {"step_id": "step_2"}],
        )
        assert decision.decision == StepProgressDecision.FINALIZE
        assert "Replanning limit" in decision.rationale

    def test_step_progress_halts_when_tool_call_limit_exceeded(self):
        decision = progress_service.evaluate_step_outcome(
            current_step_index=1,
            total_steps=5,
            tool_call_count=MAX_TOOL_CALLS_PER_RUN,  # At limit 8
            replan_count=0,
            completed_steps=["step_1"],
            failed_steps=[],
            tool_results={"step_1": {"ok": True}},
            plan_steps=[{"step_id": "step_1"}, {"step_id": "step_2"}],
        )
        assert decision.decision == StepProgressDecision.FINALIZE
        assert "Maximum tool invocations" in decision.rationale


class TestMultiStepWorkflowIntegration:
    """Integration tests running full multi-step execution sequences through LangGraph."""

    @pytest.mark.asyncio
    async def test_sequential_two_step_execution(self, test_workflow_context):
        """Tests 2 read-only tools executing sequentially with state passed between steps."""
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-two-step-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-2step-01",
            "run_id": "run-2step-01",
            "thread_id": thread_id,
            "organization_id": test_workflow_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "two_step: Look up user and check their ticket history",
            "normalized_query": "two_step: Look up user and check their ticket history",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        with patch("app.tools.definitions.user_tools.get_business_api_client") as mock_user_client_factory, \
             patch("app.tools.definitions.support_history_tools.get_business_api_client") as mock_hist_client_factory, \
             patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_ticket_client_factory, \
             patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):

            mock_user_client = AsyncMock()
            mock_user_client.search_users.return_value = {
                "users": [{"id": "user-bob-uuid", "name": "Bob Smith", "email": "bob@example.com"}]
            }
            mock_user_client_factory.return_value = mock_user_client

            mock_hist_client = AsyncMock()
            mock_hist_client.summarize_support_history.return_value = {
                "records": [{"id": "ticket-101", "ticketId": "t-101", "summary": "VPN login issue"}],
                "total": 1,
            }
            mock_hist_client_factory.return_value = mock_hist_client

            mock_ticket_client = AsyncMock()
            mock_ticket_client.list_tickets.return_value = {
                "tickets": [{"id": "ticket-101", "ticket_number": 101, "title": "VPN login issue"}],
                "total": 1,
            }
            mock_ticket_client_factory.return_value = mock_ticket_client

            config = {"configurable": {"thread_id": thread_id, "context": test_workflow_context}}
            final_state = await graph.ainvoke(initial_state, config=config)

            assert final_state["workflow_status"] == "completed"
            assert final_state["completed_steps_count"] == 2
            assert final_state["tool_call_count"] == 2
            assert "step_1" in final_state["completed_steps"]
            assert "step_2" in final_state["completed_steps"]
            assert "Bob Smith" in final_state["generated_answer"]
            assert "recent support activity" in final_state["generated_answer"].lower()

    @pytest.mark.asyncio
    async def test_five_step_maximum_plan_execution(self, test_workflow_context):
        """Tests full 5-step complex operational task executing under maximum step limit."""
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-five-step-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-5step-01",
            "run_id": "run-5step-01",
            "thread_id": thread_id,
            "organization_id": test_workflow_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "five_step: Execute full incident runbook verification",
            "normalized_query": "five_step: Execute full incident runbook verification",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        with patch("app.tools.definitions.knowledge_tools.get_business_api_client") as mock_kb_factory, \
             patch("app.tools.definitions.support_history_tools.get_business_api_client") as mock_hist_factory, \
             patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_ticket_factory, \
             patch("app.tools.definitions.user_tools.get_business_api_client") as mock_user_factory, \
             patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):

            mock_kb = AsyncMock()
            mock_kb.search_knowledge.return_value = {
                "passages": [{"chunkId": "chk-runbook", "content": "Database failover runbook instructions"}]
            }
            mock_kb_factory.return_value = mock_kb

            mock_hist = AsyncMock()
            mock_hist.summarize_support_history.return_value = {
                "records": [{"id": "t-1", "summary": "Prior ticket resolution", "ticketId": "t-1"}],
                "total": 1,
            }
            mock_hist_factory.return_value = mock_hist

            mock_user = AsyncMock()
            mock_user.search_users.return_value = {
                "users": [{"id": "user-alice", "name": "Alice Admin", "email": "alice@example.com"}]
            }
            mock_user_factory.return_value = mock_user

            mock_ticket = AsyncMock()
            mock_ticket.list_tickets.return_value = {"tickets": [], "total": 0}
            mock_ticket.get_ticket.return_value = {
                "ticket_id": "tick-1001",
                "ticket_number": 1001,
                "title": "Existing failover ticket",
                "status": "investigating",
                "priority": "high",
            }
            mock_ticket.create_ticket_proposal.return_value = {"proposalId": "prop-5step-999"}
            mock_ticket_factory.return_value = mock_ticket

            config = {"configurable": {"thread_id": thread_id, "context": test_workflow_context}}
            final_state = await graph.ainvoke(initial_state, config=config)

            # Reached step 5 which was a mutation proposal (create_support_ticket)
            assert final_state["workflow_status"] == "awaiting_approval"
            assert final_state["completed_steps_count"] == 5
            assert final_state["tool_call_count"] == 5
            assert final_state["proposal_id"] == "prop-5step-999"
            assert final_state["requires_approval"] is True
            assert "approval is required" in final_state["generated_answer"].lower()

    @pytest.mark.asyncio
    async def test_adaptive_replanning_on_step_failure(self, test_workflow_context):
        """Tests bounded replanning when an intermediate step encounters a recoverable failure."""
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-replan-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-replan-01",
            "run_id": "run-replan-01",
            "thread_id": thread_id,
            "organization_id": test_workflow_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "replan_test: Check knowledge base and fall back to history if missing",
            "normalized_query": "replan_test: Check knowledge base and fall back to history if missing",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        with patch("app.tools.definitions.knowledge_tools.get_business_api_client") as mock_kb_factory, \
             patch("app.tools.definitions.support_history_tools.get_business_api_client") as mock_hist_factory, \
             patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_ticket_factory, \
             patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):

            # Knowledge search fails on first attempt
            mock_kb = AsyncMock()
            mock_kb.search_knowledge.side_effect = RuntimeError("Elasticsearch index read timeout")
            mock_kb_factory.return_value = mock_kb

            # Fallback tool succeeds
            mock_hist = AsyncMock()
            mock_hist.summarize_support_history.return_value = {
                "records": [{"id": "t-1", "summary": "Fallback historical resolution", "ticketId": "t-1"}],
                "total": 1,
            }
            mock_hist_factory.return_value = mock_hist

            config = {"configurable": {"thread_id": thread_id, "context": test_workflow_context}}
            final_state = await graph.ainvoke(initial_state, config=config)

            assert final_state["workflow_status"] == "completed"
            assert final_state["replan_count"] >= 1
            assert "step_1" in final_state["failed_steps"]
            assert "step_revised_1" in final_state["completed_steps"]
            assert final_state["tool_call_count"] >= 2

    @pytest.mark.asyncio
    async def test_mutation_proposal_does_not_directly_write_db(self, test_workflow_context):
        """Verifies mutation proposals generate approval records and do not execute database mutations."""
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-mut-prop-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-mut-prop-01",
            "run_id": "run-mut-prop-01",
            "thread_id": thread_id,
            "organization_id": test_workflow_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "Please open a ticket for database performance issues",
            "normalized_query": "Please open a ticket for database performance issues",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        with patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_ticket_factory, \
             patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):

            mock_ticket = AsyncMock()
            mock_ticket.create_ticket_proposal.return_value = {"proposalId": "prop-sec-1010"}
            mock_ticket_factory.return_value = mock_ticket

            config = {"configurable": {"thread_id": thread_id, "context": test_workflow_context}}
            final_state = await graph.ainvoke(initial_state, config=config)

            # Must invoke create_ticket_proposal, NOT create_ticket
            mock_ticket.create_ticket_proposal.assert_called_once()
            assert not hasattr(mock_ticket, "create_ticket") or not mock_ticket.create_ticket.called
            assert final_state["workflow_status"] == "awaiting_approval"
            assert final_state["proposal_id"] == "prop-sec-1010"
            assert final_state["requires_approval"] is True
