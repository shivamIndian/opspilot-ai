"""Comprehensive automated tests for Module 11 AI Agent Tool Registry & Execution Framework."""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from pydantic import BaseModel, Field

from app.tools.base import ToolDefinition
from app.tools.context import ToolExecutionContext
from app.tools.schemas import (
    ToolRiskLevel,
    ToolExecutionMode,
    ToolActionProposal,
    ExecuteToolRequest,
    ExecuteToolResponse,
)
from app.tools.exceptions import (
    ToolError,
    ToolNotFoundError,
    ToolDisabledError,
    ToolInputInvalidError,
    ToolPermissionDeniedError,
    ToolExecutionTimeoutError,
)
from app.tools.registry import ToolRegistry
from app.tools.policies import ToolPolicyEngine
from app.tools.sanitizers import sanitize_data, sanitize_text
from app.tools.audit import ToolAuditLogger
from app.tools.executor import ToolExecutionEngine
from app.tools.definitions import register_default_tools
from app.tools.definitions.knowledge_tools import SearchKnowledgeBaseTool
from app.tools.definitions.ticket_tools import (
    GetTicketDetailsTool,
    CreateSupportTicketTool,
    UpdateSupportTicketTool,
)
from app.tools.definitions.user_tools import SearchUserInformationTool
from app.tools.definitions.support_history_tools import SummarizeSupportHistoryTool
from app.tools.adapters.langgraph_adapter import (
    LangGraphToolDescriptor,
    to_langgraph_tool,
    get_langgraph_tools,
)


@pytest.fixture
def sample_context():
    return ToolExecutionContext(
        request_id="req-test-uuid",
        execution_id="exec-test-uuid",
        authenticated_user_id="11111111-1111-4111-8111-111111111111",
        organization_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        delegated_authorization_token="jwt-delegation-token-test",
        permitted_scopes=[
            "tools:knowledge:read",
            "tools:tickets:read",
            "tools:tickets:write",
            "tools:users:read",
            "tools:history:read",
        ],
        platform_role="admin",
    )


class DummyInput(BaseModel):
    message: str = Field(..., min_length=2)


class DummyOutput(BaseModel):
    echo: str


class DummyTool(ToolDefinition):
    def __init__(self, name="dummy_tool", enabled=True, required_permissions=None):
        super().__init__(
            name=name,
            description="A test tool that echoes input",
            category="testing",
            risk_level=ToolRiskLevel.LOW,
            execution_mode=ToolExecutionMode.READ_ONLY,
            approval_required=False,
            required_permissions=required_permissions or ["tools:dummy:test"],
            input_schema=DummyInput,
            output_schema=DummyOutput,
            timeout_seconds=5.0,
            enabled=enabled,
        )

    async def execute(self, input_data: BaseModel, context: ToolExecutionContext) -> BaseModel:
        typed_in: DummyInput = input_data  # type: ignore[assignment]
        return DummyOutput(echo=f"Echo: {typed_in.message}")


class TestToolRegistry:
    def test_register_and_lookup_tool(self):
        reg = ToolRegistry()
        tool = DummyTool()
        reg.register(tool)

        assert reg.has("dummy_tool") is True
        retrieved = reg.get("dummy_tool")
        assert retrieved.name == "dummy_tool"

    def test_prevent_duplicate_registration(self):
        reg = ToolRegistry()
        tool = DummyTool()
        reg.register(tool)

        with pytest.raises(ToolError) as exc_info:
            reg.register(tool)
        assert "already registered" in str(exc_info.value)

    def test_unregistered_tool_raises_not_found(self):
        reg = ToolRegistry()
        with pytest.raises(ToolNotFoundError):
            reg.get("non_existent_tool")

    def test_discovery_metadata(self):
        reg = ToolRegistry()
        reg.register(DummyTool())
        metadata_list = reg.get_discovery_metadata()

        assert len(metadata_list) == 1
        meta = metadata_list[0]
        assert meta.name == "dummy_tool"
        assert meta.category == "testing"
        assert meta.risk_level == ToolRiskLevel.LOW
        assert "properties" in meta.parameters_schema


class TestToolContextAndPolicies:
    def test_context_scope_check(self, sample_context):
        assert sample_context.has_scope("tools:knowledge:read") is True
        assert sample_context.has_scope("tools:unauthorized:action") is False

    def test_policy_blocks_disabled_tool(self, sample_context):
        tool = DummyTool(enabled=False)
        with pytest.raises(ToolDisabledError):
            ToolPolicyEngine.evaluate(tool, sample_context)

    def test_policy_blocks_missing_scope(self, sample_context):
        tool = DummyTool(required_permissions=["tools:superuser:nuke"])
        with pytest.raises(ToolPermissionDeniedError) as exc:
            ToolPolicyEngine.evaluate(tool, sample_context)
        assert "Permission denied" in str(exc.value)

    def test_policy_allows_authorized_invocation(self, sample_context):
        tool = DummyTool(required_permissions=["tools:tickets:read"])
        # Should execute without raising
        ToolPolicyEngine.evaluate(tool, sample_context)


class TestToolSanitizationAndAudit:
    def test_sanitize_text_redacts_keys_and_control_chars(self):
        dirty = "Hello\x00World! password=super_secret_123"
        cleaned = sanitize_text(dirty)
        assert "\x00" not in cleaned
        assert "[REDACTED]" in cleaned

    def test_sanitize_data_masks_sensitive_dictionary_keys(self):
        payload = {
            "user_id": "usr-1",
            "access_token": "secret-jwt",
            "password_hash": "argon2$hash",
            "details": {
                "apiKey": "api-key-999",
                "normal": "clean_value",
            },
        }
        sanitized = sanitize_data(payload)
        assert sanitized["user_id"] == "usr-1"
        assert sanitized["access_token"] == "[REDACTED]"
        assert sanitized["password_hash"] == "[REDACTED]"
        assert sanitized["details"]["apiKey"] == "[REDACTED]"
        assert sanitized["details"]["normal"] == "clean_value"

    def test_audit_logger_hash_generation(self):
        hash1 = ToolAuditLogger.compute_input_hash({"query": "VPN issue", "top_k": 5})
        hash2 = ToolAuditLogger.compute_input_hash({"top_k": 5, "query": "VPN issue"})
        assert hash1 == hash2  # Deterministic sorting
        assert len(hash1) == 64


class TestApprovedToolsDefinitions:
    def test_default_tool_registration(self):
        reg = ToolRegistry()
        register_default_tools(reg)

        tools = reg.list_tools()
        assert len(tools) == 6
        names = {t.name for t in tools}
        expected = {
            "search_knowledge_base",
            "get_ticket_details",
            "create_support_ticket",
            "update_support_ticket",
            "search_user_information",
            "summarize_support_history",
        }
        assert names == expected

    @pytest.mark.asyncio
    async def test_search_knowledge_base_execution(self, sample_context):
        tool = SearchKnowledgeBaseTool()
        with patch("app.tools.definitions.knowledge_tools.get_business_api_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.search_knowledge.return_value = {
                "passages": [
                    {
                        "chunkId": "chk-1",
                        "documentId": "doc-1",
                        "documentName": "VPN Policy",
                        "content": "Use IPSec gateway",
                        "relevanceScore": 0.88,
                    }
                ]
            }
            mock_get_client.return_value = mock_client

            inp = tool.input_schema(query="VPN gateway", top_k=2)
            out = await tool.execute(inp, sample_context)

            assert out.result_count == 1
            assert out.passages[0].document_name == "VPN Policy"
            assert out.passages[0].content == "Use IPSec gateway"

    @pytest.mark.asyncio
    async def test_create_support_ticket_generates_proposal_only(self, sample_context):
        tool = CreateSupportTicketTool()
        assert tool.execution_mode == ToolExecutionMode.PROPOSAL_ONLY
        assert tool.approval_required is True

        with patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.create_ticket_proposal.return_value = {"proposalId": "prop-uuid-999"}
            mock_get_client.return_value = mock_client

            inp = tool.input_schema(
                title="Service Outage",
                description="Cluster worker nodes unresponsive",
                category="technical",
                priority="urgent",
            )
            out: ToolActionProposal = await tool.execute(inp, sample_context)

            assert out.proposal_id == "prop-uuid-999"
            assert out.status == "awaiting_approval"
            assert out.approval_required is True
            assert out.proposed_action["action"] == "create_ticket"
            assert out.proposed_action["priority"] == "urgent"

    @pytest.mark.asyncio
    async def test_update_support_ticket_generates_proposal_only(self, sample_context):
        tool = UpdateSupportTicketTool()
        assert tool.execution_mode == ToolExecutionMode.PROPOSAL_ONLY
        assert tool.approval_required is True

        with patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.update_ticket_proposal.return_value = {"proposalId": "prop-update-111"}
            mock_get_client.return_value = mock_client

            inp = tool.input_schema(
                ticket_id="ticket-uuid-222",
                priority="urgent",
                status="in_progress",
            )
            out: ToolActionProposal = await tool.execute(inp, sample_context)

            assert out.proposal_id == "prop-update-111"
            assert out.status == "awaiting_approval"
            assert out.proposed_action["changes"]["priority"] == "urgent"


class TestToolExecutionEngine:
    @pytest.mark.asyncio
    async def test_successful_tool_execution(self, sample_context):
        reg = ToolRegistry()
        reg.register(DummyTool(required_permissions=["tools:dummy:test"]))

        engine = ToolExecutionEngine(registry=reg)
        req = ExecuteToolRequest(
            tool_name="dummy_tool",
            arguments={"message": "System operational"},
            request_id="req-1",
            execution_id="exec-1",
            authenticated_user_id=sample_context.authenticated_user_id,
            organization_id=sample_context.organization_id,
            delegated_authorization_token=sample_context.delegated_authorization_token,
            permitted_scopes=["tools:dummy:test"],
        )

        with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock) as mock_audit:
            res: ExecuteToolResponse = await engine.execute(req)

            assert res.success is True
            assert res.data["echo"] == "Echo: System operational"
            assert res.error is None
            mock_audit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_invalid_input_validation_error(self, sample_context):
        reg = ToolRegistry()
        reg.register(DummyTool())

        engine = ToolExecutionEngine(registry=reg)
        # Message has min_length=2; passing empty message violates schema
        req = ExecuteToolRequest(
            tool_name="dummy_tool",
            arguments={"message": ""},
            request_id="req-2",
            execution_id="exec-2",
            authenticated_user_id=sample_context.authenticated_user_id,
            organization_id=sample_context.organization_id,
            delegated_authorization_token=sample_context.delegated_authorization_token,
            permitted_scopes=["tools:dummy:test"],
        )

        res: ExecuteToolResponse = await engine.execute(req)
        assert res.success is False
        assert res.error["code"] == "TOOL_INPUT_INVALID"

    @pytest.mark.asyncio
    async def test_timeout_handling(self, sample_context):
        class SlowTool(ToolDefinition):
            def __init__(self):
                super().__init__(
                    name="slow_tool",
                    description="Simulates slow tool",
                    category="test",
                    risk_level=ToolRiskLevel.LOW,
                    input_schema=DummyInput,
                    output_schema=DummyOutput,
                    timeout_seconds=0.1,
                    max_retries=0,
                )

            async def execute(self, input_data: BaseModel, context: ToolExecutionContext) -> BaseModel:
                await asyncio.sleep(0.5)
                return DummyOutput(echo="Too late")

        reg = ToolRegistry()
        reg.register(SlowTool())

        engine = ToolExecutionEngine(registry=reg)
        req = ExecuteToolRequest(
            tool_name="slow_tool",
            arguments={"message": "wait"},
            request_id="req-3",
            execution_id="exec-3",
            authenticated_user_id=sample_context.authenticated_user_id,
            organization_id=sample_context.organization_id,
            delegated_authorization_token=sample_context.delegated_authorization_token,
        )

        res = await engine.execute(req)
        assert res.success is False
        assert res.error["code"] == "TOOL_EXECUTION_TIMEOUT"


class TestLangGraphAdapter:
    def test_descriptor_wrapping_and_metadata(self):
        tool = DummyTool()
        descriptor: LangGraphToolDescriptor = to_langgraph_tool(tool)

        assert descriptor.name == "dummy_tool"
        assert descriptor.description == "A test tool that echoes input"
        assert descriptor.args_schema == DummyInput

        dict_meta = descriptor.to_dict()
        assert dict_meta["risk_level"] == "low"
        assert dict_meta["execution_mode"] == "read_only"

        openai_tool = descriptor.to_openai_tool()
        assert openai_tool["type"] == "function"
        assert openai_tool["function"]["name"] == "dummy_tool"
        assert "properties" in openai_tool["function"]["parameters"]

    @pytest.mark.asyncio
    async def test_adapter_ainvoke_with_bound_context(self, sample_context):
        reg = ToolRegistry()
        reg.register(DummyTool(required_permissions=["tools:dummy:test"]))

        with patch("app.tools.executor.get_tool_registry", return_value=reg):
            descriptor = to_langgraph_tool(reg.get("dummy_tool"))
            bound_descriptor = descriptor.bind_context(
                ToolExecutionContext(
                    request_id="req-lg",
                    execution_id="exec-lg",
                    authenticated_user_id=sample_context.authenticated_user_id,
                    organization_id=sample_context.organization_id,
                    delegated_authorization_token=sample_context.delegated_authorization_token,
                    permitted_scopes=["tools:dummy:test"],
                )
            )

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                result = await bound_descriptor.ainvoke({"message": "LangGraph bound test"})
                assert result["status"] == "success"
                assert result["data"]["echo"] == "Echo: LangGraph bound test"


class TestToolFastApiEndpoints:
    @pytest.mark.asyncio
    async def test_tools_discovery_endpoint(self):
        from httpx import AsyncClient, ASGITransport
        from app.main import app
        from app.config.settings import settings

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            res = await ac.get(
                "/internal/v1/tools",
                headers={"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["total_tools"] >= 6
            names = [t["name"] for t in data["tools"]]
            assert "search_knowledge_base" in names
            assert "create_support_ticket" in names

    @pytest.mark.asyncio
    async def test_tools_discovery_unauthorized(self):
        from httpx import AsyncClient, ASGITransport
        from app.main import app

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            res = await ac.get("/internal/v1/tools")
            assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_tools_execute_endpoint(self, sample_context):
        from httpx import AsyncClient, ASGITransport
        from app.main import app
        from app.config.settings import settings

        req_payload = {
            "tool_name": "create_support_ticket",
            "arguments": {
                "title": "Database Outage Alert",
                "description": "Primary postgres instance connection refused",
                "category": "technical",
                "priority": "urgent",
            },
            "request_id": "req-api-1",
            "execution_id": "exec-api-1",
            "authenticated_user_id": sample_context.authenticated_user_id,
            "organization_id": sample_context.organization_id,
            "delegated_authorization_token": sample_context.delegated_authorization_token,
            "permitted_scopes": ["tools:tickets:write"],
            "platform_role": "admin",
        }

        with patch("app.tools.definitions.ticket_tools.get_business_api_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.create_ticket_proposal.return_value = {"proposalId": "prop-api-123"}
            mock_get_client.return_value = mock_client

            with patch("app.tools.audit.ToolAuditLogger.log_execution", new_callable=AsyncMock):
                async with AsyncClient(
                    transport=ASGITransport(app=app), base_url="http://test"
                ) as ac:
                    res = await ac.post(
                        "/internal/v1/tools/execute",
                        headers={"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"},
                        json=req_payload,
                    )
                    assert res.status_code == 200
                    resp_data = res.json()
                    assert resp_data["success"] is True
                    assert resp_data["tool_name"] == "create_support_ticket"
                    assert resp_data["execution_mode"] == "proposal_only"
                    assert resp_data["proposal"]["status"] == "awaiting_approval"
                    assert resp_data["proposal"]["proposal_id"] == "prop-api-123"

