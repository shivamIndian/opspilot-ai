"""Automated test suite for Module 14: Human-in-the-Loop Approval & Workflow Resumption."""

import pytest
import uuid
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from app.agents.state import OpsPilotWorkflowState
from app.agents.context import WorkflowContext
from app.agents.schemas import (
    ResumeWorkflowRequest,
    ResumeWorkflowResponse,
    WorkflowRunData,
)
from app.agents.graphs.opspilot_graph import build_opspilot_workflow
from app.agents.nodes.await_human_approval import await_human_approval_node
from app.agents.routing.execution_router import route_after_validation
from app.agents.services.workflow_execution_service import WorkflowExecutionService
from app.agents.persistence import set_workflow_checkpointer
from app.llm.providers.mock_provider import MockLLMProvider
from app.llm.provider_factory import set_llm_provider


@pytest.fixture(autouse=True)
def setup_test_environment():
    mock_llm = MockLLMProvider()
    set_llm_provider(mock_llm)
    memory_saver = MemorySaver()
    set_workflow_checkpointer(memory_saver)
    return memory_saver


@pytest.fixture
def mock_context():
    return WorkflowContext(
        authenticated_user_id="11111111-1111-4111-8111-111111111111",
        organization_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        request_id="req-resumption-test-01",
        delegated_authorization_token="jwt-resumption-token",
        permitted_scopes=[
            "tools:tickets:read",
            "tools:tickets:write",
            "tools:knowledge:read",
            "tools:history:read",
        ],
        organization_role="admin",
        correlation_id="corr-resumption-01",
    )


class TestValidationAndInterruptNodes:
    def test_route_after_validation(self):
        """Tests that route_after_validation directs to await_human_approval when action is proposed."""
        # Proposal pending approval
        state_awaiting: OpsPilotWorkflowState = {
            "requires_approval": True,
            "proposal_id": "prop-123",
            "action_proposal": {"proposal_id": "prop-123"},
        }
        assert route_after_validation(state_awaiting) == "await_human_approval"

        # Proposal already approved or no approval needed
        state_normal: OpsPilotWorkflowState = {
            "requires_approval": False,
            "proposal_id": None,
            "action_proposal": None,
        }
        assert route_after_validation(state_normal) == "finalize_execution"

    @pytest.mark.asyncio
    async def test_await_human_approval_node_handles_approved_resume(self, mock_context):
        """Tests that await_human_approval unpacks approved resume payload into state."""
        state: OpsPilotWorkflowState = {
            "run_id": "run-test-01",
            "thread_id": "thread-test-01",
            "proposal_id": "prop-test-01",
            "action_proposal": {
                "proposal_id": "prop-test-01",
                "tool_name": "create_support_ticket",
                "proposed_action": {"title": "Production DB Latency Spike"},
                "risk_level": "high",
            },
            "pending_proposal_ids": ["prop-test-01"],
            "completed_proposal_ids": [],
        }

        resume_payload = {
            "decision": "approved",
            "decided_by": "22222222-2222-4222-8222-222222222222",
            "decision_reason": "Verified and authorized by team lead",
            "execution_result": {
                "ticket_id": "tick-999",
                "ticket_number": 1042,
            },
        }

        # Mock interrupt to simulate resuming with payload
        with patch("app.agents.nodes.await_human_approval.interrupt", return_value=resume_payload):
            config = {"configurable": {"thread_id": "thread-test-01", "context": mock_context}}
            result = await await_human_approval_node(state, config=config)

            assert result["workflow_status"] == "completed"
            assert result["human_approval_decision"] == "approved"
            assert result["requires_approval"] is False
            assert result["approval_decided_by"] == "22222222-2222-4222-8222-222222222222"
            assert result["execution_result"]["ticket_number"] == 1042
            assert "prop-test-01" in result["completed_proposal_ids"]
            assert "prop-test-01" not in result["pending_proposal_ids"]

    @pytest.mark.asyncio
    async def test_await_human_approval_node_handles_rejected_resume(self, mock_context):
        """Tests that await_human_approval unpacks rejected resume payload into state."""
        state: OpsPilotWorkflowState = {
            "run_id": "run-test-02",
            "thread_id": "thread-test-02",
            "proposal_id": "prop-test-02",
            "action_proposal": {
                "proposal_id": "prop-test-02",
                "tool_name": "update_support_ticket",
                "proposed_action": {"ticket_id": "tick-100", "status": "closed"},
                "risk_level": "critical",
            },
            "pending_proposal_ids": ["prop-test-02"],
            "completed_proposal_ids": [],
        }

        resume_payload = {
            "decision": "rejected",
            "decided_by": "33333333-3333-4333-8333-333333333333",
            "decision_reason": "Customer SLA not yet resolved",
            "execution_result": None,
        }

        with patch("app.agents.nodes.await_human_approval.interrupt", return_value=resume_payload):
            config = {"configurable": {"thread_id": "thread-test-02", "context": mock_context}}
            result = await await_human_approval_node(state, config=config)

            assert result["workflow_status"] == "rejected"
            assert result["human_approval_decision"] == "rejected"
            assert result["requires_approval"] is False
            assert result["approval_decision_reason"] == "Customer SLA not yet resolved"


class TestLangGraphInterruptionAndResumption:
    @pytest.mark.asyncio
    async def test_graph_interrupt_and_resume_approved_flow(self, mock_context):
        """Tests end-to-end graph execution pausing at interrupt and resuming on approved command."""
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = f"thread-e2e-resume-{uuid.uuid4()}"
        config = {"configurable": {"thread_id": thread_id, "context": mock_context}}

        initial_state: OpsPilotWorkflowState = {
            "request_id": str(uuid.uuid4()),
            "organization_id": mock_context.organization_id,
            "original_query": "Please open a high priority support ticket for database failover",
            "workflow_version": "v1.0",
            "user_id": mock_context.authenticated_user_id,
            "organization_role": mock_context.organization_role,
            "delegated_authorization_token": mock_context.delegated_authorization_token,
            "permitted_scopes": mock_context.permitted_scopes,
            "action_proposals": [],
        }

        # Step 1: Initial invocation reaches interrupt()
        with patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_client_factory:
            mock_client = AsyncMock()
            mock_client.create_ticket_proposal.return_value = {"proposalId": "prop-ticket-e2e"}
            mock_client_factory.return_value = mock_client

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                state_after_interrupt = await graph.ainvoke(initial_state, config=config)

                # LangGraph captures the interrupt payload in '__interrupt__'
                assert "__interrupt__" in state_after_interrupt
                interrupt_info = state_after_interrupt["__interrupt__"][0].value
                assert interrupt_info["status"] == "awaiting_approval"
                assert interrupt_info["proposal_id"] == "prop-ticket-e2e"

        # Step 2: Resume thread with Command(resume=...) indicating approval and execution result
        resume_command = Command(
            resume={
                "decision": "approved",
                "decided_by": "admin-approver-uuid",
                "decision_reason": "Confirmed database failover SOP",
                "execution_result": {
                    "ticket_id": "ticket-uuid-777",
                    "ticket_number": 2048,
                    "subject": "Database Failover",
                    "status": "open",
                },
            }
        )

        final_state = await graph.ainvoke(resume_command, config=config)

        assert final_state["workflow_status"] == "completed"
        assert final_state["human_approval_decision"] == "approved"
        assert "Ticket #2048" in final_state["generated_answer"]
        assert final_state["requires_approval"] is False

    @pytest.mark.asyncio
    async def test_graph_interrupt_and_resume_rejected_flow(self, mock_context):
        """Tests end-to-end graph execution pausing at interrupt and resuming on rejected command."""
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = f"thread-e2e-reject-{uuid.uuid4()}"
        config = {"configurable": {"thread_id": thread_id, "context": mock_context}}

        initial_state: OpsPilotWorkflowState = {
            "request_id": str(uuid.uuid4()),
            "organization_id": mock_context.organization_id,
            "original_query": "Please update ticket 100 to closed status",
            "workflow_version": "v1.0",
            "user_id": mock_context.authenticated_user_id,
            "organization_role": mock_context.organization_role,
            "delegated_authorization_token": mock_context.delegated_authorization_token,
            "permitted_scopes": mock_context.permitted_scopes,
            "action_proposals": [],
        }

        with patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_client_factory:
            mock_client = AsyncMock()
            mock_client.get_ticket.return_value = {
                "ticket_id": "100",
                "organization_id": mock_context.organization_id,
                "ticket_number": 100,
                "title": "Incident 100",
                "description": "DB failover incident",
                "status": "open",
                "priority": "high",
                "category": "infrastructure",
                "created_by": mock_context.authenticated_user_id,
                "assigned_to": None,
                "created_at": "2026-11-04T00:00:00Z",
                "updated_at": "2026-11-04T00:00:00Z",
            }
            mock_client.update_ticket_proposal.return_value = {"proposalId": "prop-ticket-close"}
            mock_client.create_ticket_proposal.return_value = {"proposalId": "prop-ticket-close"}
            mock_client_factory.return_value = mock_client

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                state_after_interrupt = await graph.ainvoke(initial_state, config=config)
                assert "__interrupt__" in state_after_interrupt

        # Resume with rejection
        resume_command = Command(
            resume={
                "decision": "rejected",
                "decided_by": "admin-approver-uuid",
                "decision_reason": "Post-incident verification not yet signed off",
                "execution_result": None,
            }
        )

        final_state = await graph.ainvoke(resume_command, config=config)

        assert final_state["workflow_status"] == "rejected"
        assert final_state["human_approval_decision"] == "rejected"
        assert "Post-incident verification not yet signed off" in final_state["generated_answer"]


class TestWorkflowExecutionServiceResumption:
    @pytest.mark.asyncio
    async def test_resume_workflow_service_method(self, mock_context):
        """Tests that WorkflowExecutionService.resume_workflow resumes graph and updates repository."""
        service = WorkflowExecutionService()

        # Mock the compiled graph's ainvoke
        mock_graph = AsyncMock()
        mock_graph.ainvoke.return_value = {
            "run_id": str(uuid.uuid4()),
            "workflow_status": "completed",
            "generated_answer": "The proposed action was approved and Ticket #1042 was created.",
            "human_approval_decision": "approved",
            "intent": "action_execution",
            "selected_tool": "create_support_ticket",
            "citation_data": [],
            "insufficient_evidence": False,
        }

        resume_request = ResumeWorkflowRequest(
            thread_id="thread-serv-1",
            proposal_id="prop-serv-1",
            decision="approved",
            decided_by="admin-user-id",
            decision_reason="Authorized",
            execution_result={"ticket_number": 1042},
        )

        with patch("app.agents.graphs.opspilot_graph.build_opspilot_workflow", return_value=mock_graph):
            with patch("app.agents.repositories.workflow_run_repository.WorkflowRunRepository.update_run_outcome", new_callable=AsyncMock) as mock_update_db:
                run_data = await service.resume_workflow(resume_request)

                assert isinstance(run_data, WorkflowRunData)
                assert run_data.status == "completed"
                assert "Ticket #1042" in run_data.answer
                assert mock_update_db.called


class TestResumeFastApiEndpoint:
    @pytest.mark.asyncio
    async def test_resume_endpoint_unauthorized_token(self):
        """Tests that /internal/v1/agent/workflows/resume rejects requests without valid service token."""
        from httpx import AsyncClient, ASGITransport
        from app.main import app

        payload = {
            "thread_id": "thread-unauth-1",
            "proposal_id": "prop-unauth-1",
            "decision": "approved",
        }

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post(
                "/internal/v1/agent/workflows/resume",
                headers={"Authorization": "Bearer wrong-token"},
                json=payload,
            )
            assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_resume_endpoint_success(self, mock_context):
        """Tests that /internal/v1/agent/workflows/resume returns 200 with ResumeWorkflowResponse."""
        from httpx import AsyncClient, ASGITransport
        from app.main import app
        from app.config.settings import settings

        payload = {
            "thread_id": "thread-auth-1",
            "proposal_id": "prop-auth-1",
            "decision": "approved",
            "decided_by": "admin-1",
            "execution_result": {"ticket_number": 9999},
        }

        mock_run_data = WorkflowRunData(
            run_id="run-resumed-99",
            thread_id="thread-auth-1",
            organization_id=mock_context.organization_id,
            status="completed",
            intent="action_execution",
            selected_tool="create_support_ticket",
            answer="Approved and Ticket #9999 created.",
            citations=[],
            insufficient_evidence=False,
            requires_approval=False,
            proposal=None,
            proposal_id=None,
            error_code=None,
            duration_ms=45.0,
            total_steps=1,
            completed_steps=[],
            tool_call_count=1,
            replan_count=0,
            action_proposals=[],
            execution_summary="Completed successfully",
        )

        with patch("app.agents.services.workflow_execution_service.WorkflowExecutionService.resume_workflow", new_callable=AsyncMock) as mock_resume_service:
            mock_resume_service.return_value = mock_run_data

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                res = await ac.post(
                    "/internal/v1/agent/workflows/resume",
                    headers={"x-internal-service-token": settings.AI_SERVICE_INTERNAL_TOKEN},
                    json=payload,
                )

                assert res.status_code == 200
                data = res.json()
                assert data["success"] is True
                assert data["data"]["status"] == "completed"
                assert "Ticket #9999" in data["data"]["answer"]
