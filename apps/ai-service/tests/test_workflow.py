"""Automated test suite for Module 12 LangGraph Workflow Engine."""

import pytest
import uuid
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.memory import MemorySaver

from app.agents.state import OpsPilotWorkflowState
from app.agents.context import WorkflowContext
from app.agents.schemas import (
    WorkflowIntent,
    RunWorkflowRequest,
    WorkflowRunData,
    WorkflowIntentClassification,
    WorkflowExecutionPlan,
)
from app.agents.graphs import build_opspilot_workflow
from app.agents.nodes import (
    validate_input_node,
    classify_intent_node,
    create_plan_node,
    policy_check_node,
    knowledge_retrieval_node,
    execute_readonly_tool_node,
    propose_mutation_node,
    generate_response_node,
    validate_response_node,
    finalize_run_node,
)
from app.agents.routing import route_after_policy_check
from app.agents.services.workflow_execution_service import WorkflowExecutionService
from app.agents.services.workflow_status_service import WorkflowStatusService
from app.agents.exceptions import (
    WorkflowInvalidInputError,
    WorkflowRunNotFoundError,
)
from app.agents.persistence import set_workflow_checkpointer
from app.tools.registry import get_tool_registry
from app.tools.schemas import ToolRiskLevel, ToolExecutionMode
from app.llm.providers.mock_provider import MockLLMProvider
from app.llm.provider_factory import set_llm_provider


@pytest.fixture(autouse=True)
def setup_test_providers():
    """Ensures MockLLMProvider and MemorySaver are used across all workflow tests."""
    mock_llm = MockLLMProvider()
    set_llm_provider(mock_llm)
    memory_saver = MemorySaver()
    set_workflow_checkpointer(memory_saver)
    return mock_llm


@pytest.fixture
def mock_context():
    return WorkflowContext(
        authenticated_user_id="11111111-1111-4111-8111-111111111111",
        organization_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        request_id="req-wf-test-01",
        delegated_authorization_token="jwt-wf-assertion-test",
        permitted_scopes=[
            "tools:knowledge:read",
            "tools:tickets:read",
            "tools:tickets:write",
            "tools:users:read",
            "tools:history:read",
        ],
        organization_role="admin",
        correlation_id="corr-wf-01",
    )


class TestWorkflowNodes:
    @pytest.mark.asyncio
    async def test_validate_input_node_success(self):
        state: OpsPilotWorkflowState = {
            "original_query": "  How do I configure SSO?  ",
            "request_id": "req-1",
            "organization_id": "org-1",
            "run_id": "run-1",
        }
        res = await validate_input_node(state, config={})
        assert res["normalized_query"] == "How do I configure SSO?"
        assert res["workflow_status"] == "running"
        assert res["insufficient_evidence"] is False

    @pytest.mark.asyncio
    async def test_validate_input_node_empty_query_raises(self):
        state: OpsPilotWorkflowState = {
            "original_query": "   ",
            "request_id": "req-1",
            "organization_id": "org-1",
        }
        with pytest.raises(WorkflowInvalidInputError):
            await validate_input_node(state, config={})

    @pytest.mark.asyncio
    async def test_policy_check_approved_route(self, mock_context):
        state: OpsPilotWorkflowState = {
            "selected_tool": "search_knowledge_base",
            "intent": "knowledge_question",
        }
        config = {"configurable": {"context": mock_context}}
        res = await policy_check_node(state, config)
        assert res["route_target"] == "knowledge_retrieval"

    @pytest.mark.asyncio
    async def test_policy_check_missing_scope_blocks(self, mock_context):
        restricted_context = WorkflowContext(
            authenticated_user_id=mock_context.authenticated_user_id,
            organization_id=mock_context.organization_id,
            request_id="req-blocked",
            delegated_authorization_token="jwt",
            permitted_scopes=["tools:knowledge:read"],  # Missing tools:tickets:write
        )
        state: OpsPilotWorkflowState = {
            "selected_tool": "create_support_ticket",
            "intent": "ticket_creation_request",
        }
        config = {"configurable": {"context": restricted_context}}
        res = await policy_check_node(state, config)
        assert res["route_target"] == "policy_blocked"
        assert res["workflow_status"] == "blocked"
        assert res["error_code"] == "WORKFLOW_POLICY_BLOCKED"

    @pytest.mark.asyncio
    async def test_propose_mutation_node_generates_proposal(self, mock_context):
        state: OpsPilotWorkflowState = {
            "selected_tool": "create_support_ticket",
            "tool_arguments": {
                "title": "Outage Alert",
                "description": "Cluster database connection failed",
                "category": "technical",
                "priority": "urgent",
            },
            "request_id": "req-prop-1",
            "run_id": "run-prop-1",
            "organization_id": mock_context.organization_id,
        }
        config = {"configurable": {"context": mock_context}}

        with patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_client_factory:
            mock_client = AsyncMock()
            mock_client.create_ticket_proposal.return_value = {"proposalId": "prop-uuid-999"}
            mock_client_factory.return_value = mock_client

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                res = await propose_mutation_node(state, config)

                assert res["requires_approval"] is True
                assert res["proposal_id"] == "prop-uuid-999"
                assert res["workflow_status"] == "awaiting_approval"
                assert res["proposed_action"]["action"] == "create_ticket"

    @pytest.mark.asyncio
    async def test_knowledge_retrieval_insufficient_evidence_flag(self, mock_context):
        state: OpsPilotWorkflowState = {
            "selected_tool": "search_knowledge_base",
            "tool_arguments": {"query": "non_existent_term_xyz"},
            "request_id": "req-kr-1",
            "run_id": "run-kr-1",
            "organization_id": mock_context.organization_id,
        }
        config = {"configurable": {"context": mock_context}}

        with patch("app.tools.definitions.knowledge_tools.get_business_api_client") as mock_client_factory:
            mock_client = AsyncMock()
            mock_client.search_knowledge.return_value = {"passages": []}
            mock_client_factory.return_value = mock_client

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                res = await knowledge_retrieval_node(state, config)

                assert res["insufficient_evidence"] is True
                assert len(res["retrieved_sources"]) == 0

    @pytest.mark.asyncio
    async def test_validate_response_strips_hallucinated_citations(self):
        state: OpsPilotWorkflowState = {
            "generated_answer": "According to policy [S1] and rule [S99], MFA is mandatory.",
            "retrieved_sources": [{"document_name": "Security Policy"}],  # Only S1 is valid
        }
        res = await validate_response_node(state, config={})
        assert "[S1]" in res["generated_answer"]
        assert "[S99]" not in res["generated_answer"]


class TestWorkflowConditionalRouting:
    def test_routing_to_knowledge_retrieval(self):
        state: OpsPilotWorkflowState = {"route_target": "knowledge_retrieval"}
        assert route_after_policy_check(state) == "knowledge_retrieval"

    def test_routing_to_readonly_tool(self):
        state: OpsPilotWorkflowState = {"route_target": "execute_readonly_tool"}
        assert route_after_policy_check(state) == "execute_readonly_tool"

    def test_routing_to_propose_mutation(self):
        state: OpsPilotWorkflowState = {"route_target": "propose_mutation"}
        assert route_after_policy_check(state) == "propose_mutation"

    def test_routing_to_direct_response_for_clarification_or_general(self):
        assert route_after_policy_check({"route_target": "needs_clarification"}) == "generate_response"
        assert route_after_policy_check({"route_target": "unsupported_request"}) == "generate_response"
        assert route_after_policy_check({"route_target": "general_question"}) == "generate_response"
        assert route_after_policy_check({"route_target": "policy_blocked"}) == "generate_response"


class TestFullGraphExecution:
    @pytest.mark.asyncio
    async def test_knowledge_question_e2e_flow(self, mock_context):
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-kr-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-kr-e2e",
            "run_id": "run-kr-e2e",
            "thread_id": thread_id,
            "organization_id": mock_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "What is the corporate password policy?",
            "normalized_query": "What is the corporate password policy?",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        with patch("app.tools.definitions.knowledge_tools.get_business_api_client") as mock_client_factory:
            mock_client = AsyncMock()
            mock_client.search_knowledge.return_value = {
                "passages": [
                    {
                        "chunkId": "chk-1",
                        "documentId": "doc-1",
                        "documentName": "Password Policy",
                        "content": "Passwords must be at least 14 characters long and include numbers.",
                        "relevanceScore": 0.95,
                    }
                ]
            }
            mock_client_factory.return_value = mock_client

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                config = {"configurable": {"thread_id": thread_id, "context": mock_context}}
                final_state = await graph.ainvoke(initial_state, config=config)

                assert final_state["workflow_status"] == "completed"
                assert final_state["intent"] == "knowledge_question"
                assert final_state["selected_tool"] == "search_knowledge_base"
                assert final_state["insufficient_evidence"] is False
                assert len(final_state["retrieved_sources"]) == 1
                assert "characters" in final_state["generated_answer"] or "guidelines" in final_state["generated_answer"]

                # Verify state persisted in checkpointer
                persisted_tuple = await checkpointer.aget_tuple({"configurable": {"thread_id": thread_id}})
                assert persisted_tuple is not None
                assert persisted_tuple.checkpoint["channel_values"]["workflow_status"] == "completed"

    @pytest.mark.asyncio
    async def test_ticket_creation_proposal_e2e_flow(self, mock_context):
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-ticket-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-ticket-create-e2e",
            "run_id": "run-ticket-create-e2e",
            "thread_id": thread_id,
            "organization_id": mock_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "Please open a ticket for database performance issues",
            "normalized_query": "Please open a ticket for database performance issues",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        with patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_client_factory:
            mock_client = AsyncMock()
            mock_client.create_ticket_proposal.return_value = {"proposalId": "prop-test-777"}
            mock_client_factory.return_value = mock_client

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                config = {"configurable": {"thread_id": thread_id, "context": mock_context}}
                final_state = await graph.ainvoke(initial_state, config=config)

                assert final_state["workflow_status"] == "awaiting_approval"
                assert final_state["requires_approval"] is True
                assert final_state["proposal_id"] == "prop-test-777"
                assert "approval is required" in final_state["generated_answer"].lower()

    @pytest.mark.asyncio
    async def test_policy_blocked_e2e_flow(self, mock_context):
        restricted_context = WorkflowContext(
            authenticated_user_id=mock_context.authenticated_user_id,
            organization_id=mock_context.organization_id,
            request_id="req-policy-blocked",
            delegated_authorization_token="jwt",
            permitted_scopes=["tools:knowledge:read"],  # No write scope
        )
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-blocked-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-blocked-e2e",
            "run_id": "run-blocked-e2e",
            "thread_id": thread_id,
            "organization_id": mock_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "Create a new ticket for high latency",
            "normalized_query": "Create a new ticket for high latency",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        config = {"configurable": {"thread_id": thread_id, "context": restricted_context}}
        final_state = await graph.ainvoke(initial_state, config=config)

        assert final_state["workflow_status"] == "blocked"
        assert final_state["error_code"] == "WORKFLOW_POLICY_BLOCKED"
        assert "cannot complete this request" in final_state["generated_answer"].lower()

    @pytest.mark.asyncio
    async def test_ticket_lookup_e2e_flow(self, mock_context):
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-lookup-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-lookup-e2e",
            "run_id": "run-lookup-e2e",
            "thread_id": thread_id,
            "organization_id": mock_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "Check status of ticket #104",
            "normalized_query": "Check status of ticket #104",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        with patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_client_factory:
            mock_client = AsyncMock()
            mock_client.get_ticket.return_value = {
                "ticket_id": "22222222-2222-4222-8222-222222222222",
                "ticket_number": 104,
                "title": "Database latency spike",
                "status": "open",
                "priority": "high",
                "category": "technical",
                "created_at": "2026-11-04T00:00:00Z",
                "updated_at": "2026-11-04T00:00:00Z",
            }
            mock_client_factory.return_value = mock_client

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                config = {"configurable": {"thread_id": thread_id, "context": mock_context}}
                final_state = await graph.ainvoke(initial_state, config=config)

                assert final_state["workflow_status"] == "completed"
                assert final_state["selected_tool"] == "get_ticket_details"
                assert "Ticket #104" in final_state["generated_answer"]
                assert "high" in final_state["generated_answer"]

    @pytest.mark.asyncio
    async def test_user_lookup_e2e_flow(self, mock_context):
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-users-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-user-e2e",
            "run_id": "run-user-e2e",
            "thread_id": thread_id,
            "organization_id": mock_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "Lookup members on the team Alice",
            "normalized_query": "Lookup members on the team Alice",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        with patch("app.tools.definitions.user_tools.get_business_api_client") as mock_client_factory:
            mock_client = AsyncMock()
            mock_client.search_users.return_value = {
                "users": [
                    {"userId": "usr-1", "name": "Alice Smith", "role": "admin", "status": "active"}
                ]
            }
            mock_client_factory.return_value = mock_client

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                config = {"configurable": {"thread_id": thread_id, "context": mock_context}}
                final_state = await graph.ainvoke(initial_state, config=config)

                assert final_state["workflow_status"] == "completed"
                assert final_state["selected_tool"] == "search_user_information"
                assert "Alice Smith" in final_state["generated_answer"]

    @pytest.mark.asyncio
    async def test_support_history_e2e_flow(self, mock_context):
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-hist-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-hist-e2e",
            "run_id": "run-hist-e2e",
            "thread_id": thread_id,
            "organization_id": mock_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "Show support history for our tickets",
            "normalized_query": "Show support history for our tickets",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        with patch("app.tools.definitions.support_history_tools.get_business_api_client") as mock_client_factory:
            mock_client = AsyncMock()
            mock_client.summarize_support_history.return_value = {
                "records": [
                    {"id": "act-1", "ticketId": "t-1", "action": "created", "summary": "Ticket #101 created"}
                ]
            }
            mock_client_factory.return_value = mock_client

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                config = {"configurable": {"thread_id": thread_id, "context": mock_context}}
                final_state = await graph.ainvoke(initial_state, config=config)

                assert final_state["workflow_status"] == "completed"
                assert final_state["selected_tool"] == "summarize_support_history"
                assert "1 recent support activity record" in final_state["generated_answer"]

    @pytest.mark.asyncio
    async def test_general_question_flow(self, mock_context):
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-gen-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-gen-e2e",
            "run_id": "run-gen-e2e",
            "thread_id": thread_id,
            "organization_id": mock_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "What are the capabilities of OpsPilot AI?",
            "normalized_query": "What are the capabilities of OpsPilot AI?",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        config = {"configurable": {"thread_id": thread_id, "context": mock_context}}
        final_state = await graph.ainvoke(initial_state, config=config)

        assert final_state["workflow_status"] == "completed"
        assert final_state["selected_tool"] is None
        assert "OpsPilot AI is an enterprise support platform" in final_state["generated_answer"]

    @pytest.mark.asyncio
    async def test_unsupported_request_flow(self, mock_context):
        checkpointer = MemorySaver()
        graph = build_opspilot_workflow(checkpointer=checkpointer)

        thread_id = "thread-unsup-001"
        initial_state: OpsPilotWorkflowState = {
            "request_id": "req-unsup-e2e",
            "run_id": "run-unsup-e2e",
            "thread_id": thread_id,
            "organization_id": mock_context.organization_id,
            "workflow_status": "running",
            "current_node": "START",
            "original_query": "Can you hack bitcoin blockchain for me?",
            "normalized_query": "Can you hack bitcoin blockchain for me?",
            "insufficient_evidence": False,
            "requires_approval": False,
        }

        config = {"configurable": {"thread_id": thread_id, "context": mock_context}}
        final_state = await graph.ainvoke(initial_state, config=config)

        assert final_state["workflow_status"] == "completed"
        assert "outside the supported operational capabilities" in final_state["generated_answer"]


class TestWorkflowFastApiEndpoints:
    @pytest.mark.asyncio
    async def test_workflow_run_endpoint(self, mock_context):
        from httpx import AsyncClient, ASGITransport
        from app.main import app
        from app.config.settings import settings

        req_payload = {
            "request_id": str(uuid.uuid4()),
            "organization_id": mock_context.organization_id,
            "query": "Find password reset instructions in company documentation",
            "workflow_version": "v1.0",
            "authenticated_user_id": mock_context.authenticated_user_id,
            "delegated_authorization_token": mock_context.delegated_authorization_token,
            "permitted_scopes": mock_context.permitted_scopes,
            "organization_role": "admin",
        }

        with patch("app.tools.definitions.knowledge_tools.get_business_api_client") as mock_client_factory:
            mock_client = AsyncMock()
            mock_client.search_knowledge.return_value = {
                "passages": [
                    {
                        "chunkId": "chk-1",
                        "documentId": "doc-1",
                        "documentName": "Security Manual",
                        "content": "Reset passwords through portal.acme.corp",
                        "relevanceScore": 0.91,
                    }
                ]
            }
            mock_client_factory.return_value = mock_client

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                with patch("app.agents.repositories.workflow_run_repository.WorkflowRunRepository.create_run", new_callable=AsyncMock):
                    with patch("app.agents.repositories.workflow_run_repository.WorkflowRunRepository.update_run_outcome", new_callable=AsyncMock):
                        with patch("app.agents.repositories.workflow_run_repository.WorkflowRunRepository.get_by_request_id", return_value=None):
                            async with AsyncClient(
                                transport=ASGITransport(app=app), base_url="http://test"
                            ) as ac:
                                res = await ac.post(
                                    "/internal/v1/agent/workflows/run",
                                    headers={"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"},
                                    json=req_payload,
                                )

                                assert res.status_code == 200
                                body = res.json()
                                assert body["success"] is True
                                assert body["data"]["status"] == "completed"
                                assert body["data"]["intent"] == "knowledge_question"
                                assert body["data"]["selected_tool"] == "search_knowledge_base"
                                assert body["data"]["answer"] is not None

    @pytest.mark.asyncio
    async def test_workflow_run_endpoint_unauthorized_service(self, mock_context):
        from httpx import AsyncClient, ASGITransport
        from app.main import app

        req_payload = {
            "request_id": str(uuid.uuid4()),
            "organization_id": mock_context.organization_id,
            "query": "Test query",
            "authenticated_user_id": mock_context.authenticated_user_id,
            "delegated_authorization_token": "token",
        }

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            res = await ac.post("/internal/v1/agent/workflows/run", json=req_payload)
            assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_workflow_status_endpoint(self, mock_context):
        from httpx import AsyncClient, ASGITransport
        from app.main import app
        from app.config.settings import settings
        from app.agents.models import AgentWorkflowRun

        run_id = str(uuid.uuid4())
        mock_run = MagicMock(spec=AgentWorkflowRun)
        mock_run.id = uuid.UUID(run_id)
        mock_run.thread_id = "thread-status-123"
        mock_run.organization_id = uuid.UUID(mock_context.organization_id)
        mock_run.status = "completed"
        mock_run.intent = "knowledge_question"
        mock_run.selected_tool = "search_knowledge_base"
        mock_run.requires_approval = False
        mock_run.proposal_id = None
        mock_run.error_code = None

        with patch("app.agents.repositories.workflow_run_repository.WorkflowRunRepository.get_by_id", return_value=mock_run):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                res = await ac.get(
                    f"/internal/v1/agent/workflows/{run_id}?organization_id={mock_context.organization_id}",
                    headers={"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"},
                )
                assert res.status_code == 200
                data = res.json()
                assert data["success"] is True
                assert data["data"]["run_id"] == run_id
                assert data["data"]["status"] == "completed"

    @pytest.mark.asyncio
    async def test_workflow_status_endpoint_not_found(self, mock_context):
        from httpx import AsyncClient, ASGITransport
        from app.main import app
        from app.config.settings import settings

        run_id = str(uuid.uuid4())
        with patch("app.agents.repositories.workflow_run_repository.WorkflowRunRepository.get_by_id", return_value=None):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                res = await ac.get(
                    f"/internal/v1/agent/workflows/{run_id}?organization_id={mock_context.organization_id}",
                    headers={"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"},
                )
                assert res.status_code == 404

    @pytest.mark.asyncio
    async def test_workflow_analytics_endpoint_success(self, mock_context):
        from httpx import AsyncClient, ASGITransport
        from app.main import app
        from app.config.settings import settings

        mock_analytics_data = {
            "total_runs": 12,
            "successful_runs": 10,
            "failed_runs": 1,
            "waiting_approval_runs": 1,
            "running_runs": 0,
            "success_rate": 83.3,
            "avg_duration_ms": 1240.5,
            "total_tool_calls": 24,
            "recent_runs": [
                {
                    "id": str(uuid.uuid4()),
                    "thread_id": "thread-1",
                    "status": "completed",
                    "intent": "knowledge_question",
                    "selected_tool": "search_knowledge_base",
                    "duration_ms": 1100.0,
                    "created_at": "2026-11-04T12:00:00Z",
                }
            ],
        }

        with patch(
            "app.agents.repositories.workflow_run_repository.WorkflowRunRepository.get_workflow_analytics",
            new_callable=AsyncMock,
            return_value=mock_analytics_data,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                res = await ac.get(
                    f"/internal/v1/agent/workflows/analytics/summary?organization_id={mock_context.organization_id}&from_date=2026-11-01T00:00:00Z",
                    headers={"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"},
                )
                assert res.status_code == 200
                body = res.json()
                assert body["success"] is True
                assert body["data"]["total_runs"] == 12
                assert body["data"]["successful_runs"] == 10
                assert body["data"]["success_rate"] == 83.3
                assert len(body["data"]["recent_runs"]) == 1

    @pytest.mark.asyncio
    async def test_workflow_analytics_endpoint_unauthorized(self, mock_context):
        from httpx import AsyncClient, ASGITransport
        from app.main import app

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            res = await ac.get(
                f"/internal/v1/agent/workflows/analytics/summary?organization_id={mock_context.organization_id}",
            )
            assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_list_workflow_runs_endpoint(self, mock_context):
        from httpx import AsyncClient, ASGITransport
        from app.main import app
        from app.config.settings import settings
        from datetime import datetime, timezone

        mock_runs_data = {
            "items": [
                MagicMock(
                    id=uuid.uuid4(),
                    thread_id="thread-list-1",
                    organization_id=uuid.UUID(mock_context.organization_id),
                    user_id=uuid.UUID(mock_context.authenticated_user_id),
                    workflow_name="opspilot_support_workflow",
                    workflow_version="v1.0",
                    status="completed",
                    intent="knowledge_question",
                    selected_tool="search_knowledge_base",
                    requires_approval=False,
                    proposal_id=None,
                    error_code=None,
                    started_at=datetime.now(timezone.utc),
                    completed_at=datetime.now(timezone.utc),
                    duration_ms=450.0,
                    total_steps=2,
                    completed_steps_count=2,
                    tool_call_count=1,
                    created_at=datetime.now(timezone.utc),
                )
            ],
            "total": 1,
            "page": 1,
            "limit": 20,
            "total_pages": 1,
        }

        with patch(
            "app.agents.repositories.workflow_run_repository.WorkflowRunRepository.list_runs",
            new_callable=AsyncMock,
            return_value=mock_runs_data,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as ac:
                res = await ac.get(
                    f"/internal/v1/agent/workflows/runs?organization_id={mock_context.organization_id}&status=completed&page=1&limit=20",
                    headers={"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"},
                )
                assert res.status_code == 200
                body = res.json()
                assert body["success"] is True
                assert body["data"]["total"] == 1
                assert len(body["data"]["items"]) == 1
                assert body["data"]["items"][0]["status"] == "completed"
                assert body["data"]["items"][0]["thread_id"] == "thread-list-1"
