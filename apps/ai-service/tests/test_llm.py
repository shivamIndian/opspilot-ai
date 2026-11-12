"""Comprehensive tests for LLM provider abstraction, prompt management, structured output, citation validation, and internal API."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from pydantic import BaseModel

import openai
from app.llm.base import LLMProvider
from app.llm.schemas import (
    SourceContextItem,
    StructuredAnswer,
    InternalLLMGenerateRequest,
    InternalLLMGenerateResponse,
    LLMUsage,
)
from app.llm.providers.openai_provider import OpenAIProvider
from app.llm.providers.mock_provider import MockLLMProvider
from app.llm.provider_factory import get_llm_provider, set_llm_provider
from app.llm.services.prompt_manager import PromptManager, get_prompt_manager
from app.llm.services.context_builder import ContextBuilder
from app.llm.services.citation_validator import CitationValidator
from app.llm.services.response_generation_service import ResponseGenerationService
from app.llm.exceptions import (
    LLMAuthenticationFailedError,
    LLMRateLimitedError,
    LLMQuotaExceededError,
    LLMTimeoutError,
    LLMProviderUnavailableError,
    LLMContextTooLargeError,
    LLMStructuredOutputFailedError,
    LLMConfigurationError,
    LLMContentFilteredError,
)


class DummySchema(BaseModel):
    name: str
    count: int


# =====================================================================
# 1. PROVIDER TESTS
# =====================================================================

class TestLLMProviders:
    def test_openai_provider_missing_api_key_raises(self):
        with pytest.raises(LLMAuthenticationFailedError):
            OpenAIProvider(api_key="")

        with pytest.raises(LLMAuthenticationFailedError):
            OpenAIProvider(api_key="replace_with_actual_key")

    @pytest.mark.asyncio
    async def test_mock_provider_generate_structured_success(self):
        provider = MockLLMProvider()
        messages = [
            {"role": "system", "content": "System directive"},
            {"role": "user", "content": "How do I reset password? [S1] Document handbook"},
        ]

        answer, usage = await provider.generate_structured(messages, StructuredAnswer)
        assert isinstance(answer, StructuredAnswer)
        assert answer.answer is not None
        assert answer.cited_source_ids == ["S1"]
        assert answer.insufficient_evidence is False
        assert usage.total_tokens is not None
        assert usage.total_tokens > 0

    @pytest.mark.asyncio
    async def test_mock_provider_insufficient_evidence_when_no_sources(self):
        provider = MockLLMProvider()
        messages = [
            {"role": "system", "content": "System directive"},
            {"role": "user", "content": "What is the policy? No sources provided."},
        ]

        answer, usage = await provider.generate_structured(messages, StructuredAnswer)
        assert answer.insufficient_evidence is True
        assert len(answer.cited_source_ids) == 0
        assert "sufficient information" in answer.answer.lower()

    @pytest.mark.asyncio
    async def test_mock_provider_forced_error(self):
        provider = MockLLMProvider(force_error=LLMRateLimitedError("Rate limit hit"))
        with pytest.raises(LLMRateLimitedError):
            await provider.generate_structured([], StructuredAnswer)

    def test_provider_factory_unknown_provider_raises(self):
        with pytest.raises(LLMConfigurationError):
            get_llm_provider(provider_name="unsupported_vendor")

    def test_openai_error_translation(self):
        provider = OpenAIProvider(api_key="sk-valid-test-key-for-mocking-1234567890")

        # Auth error
        auth_err = openai.AuthenticationError(
            message="Incorrect API key",
            response=MagicMock(status_code=401),
            body=None,
        )
        translated = provider._translate_error(auth_err)
        assert isinstance(translated, LLMAuthenticationFailedError)

        # Rate limit
        rate_err = openai.RateLimitError(
            message="Rate limit reached for requests",
            response=MagicMock(status_code=429),
            body=None,
        )
        translated_rate = provider._translate_error(rate_err)
        assert isinstance(translated_rate, LLMRateLimitedError)

        # Quota exceeded
        quota_err = openai.RateLimitError(
            message="You exceeded your current quota, please check your plan and billing details.",
            response=MagicMock(status_code=429),
            body=None,
        )
        translated_quota = provider._translate_error(quota_err)
        assert isinstance(translated_quota, LLMQuotaExceededError)

        # Timeout
        timeout_err = openai.APITimeoutError(request=MagicMock())
        translated_timeout = provider._translate_error(timeout_err)
        assert isinstance(translated_timeout, LLMTimeoutError)

        # Connection error
        conn_err = openai.APIConnectionError(request=MagicMock())
        translated_conn = provider._translate_error(conn_err)
        assert isinstance(translated_conn, LLMProviderUnavailableError)


# =====================================================================
# 2. PROMPT MANAGEMENT TESTS
# =====================================================================

class TestPromptManager:
    def test_load_system_prompt_version_success(self):
        pm = get_prompt_manager()
        prompt = pm.get_system_prompt("rag_assistant_v1")
        assert "OpsPilot AI" in prompt
        assert "<retrieved_context>" in prompt
        assert "PROMPT INJECTION DEFENSE" in prompt

    def test_load_non_existent_system_prompt_raises(self):
        pm = get_prompt_manager()
        with pytest.raises(LLMConfigurationError):
            pm.get_system_prompt("non_existent_v999")

    def test_build_messages_structure(self):
        pm = get_prompt_manager()
        messages = pm.build_messages(
            query="How to update billing email?",
            formatted_context="[S1] Go to Settings -> Billing",
            system_version="rag_assistant_v1",
        )
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        assert "<user_query>" in messages[1]["content"]
        assert "How to update billing email?" in messages[1]["content"]
        assert "<retrieved_context>" in messages[1]["content"]
        assert "[S1] Go to Settings -> Billing" in messages[1]["content"]


# =====================================================================
# 3. CONTEXT BUILDER TESTS
# =====================================================================

class TestContextBuilder:
    def test_context_builder_formatting_and_budget(self):
        builder = ContextBuilder(default_max_tokens=200)

        s1 = SourceContextItem(
            source_id="S1",
            document_id="11111111-1111-1111-1111-111111111111",
            chunk_id="22222222-2222-2222-2222-222222222222",
            content="First paragraph with password guidelines.",
            document_name="Security Guide",
            page_start=1,
            page_end=1,
            section_title="Passwords",
        )
        s2 = SourceContextItem(
            source_id="S2",
            document_id="11111111-1111-1111-1111-111111111111",
            chunk_id="33333333-3333-3333-3333-333333333333",
            content="Second paragraph with session timeouts.",
            document_name="Security Guide",
            page_start=2,
            page_end=2,
            section_title="Sessions",
        )

        context_str, included, tokens = builder.build_context([s1, s2])
        assert len(included) == 2
        assert "--- SOURCE [S1] ---" in context_str
        assert "--- SOURCE [S2] ---" in context_str
        assert tokens > 0

    def test_context_builder_budget_truncation(self):
        # Set a tiny token limit (e.g. 25 tokens)
        builder = ContextBuilder(default_max_tokens=25)

        s1 = SourceContextItem(
            source_id="S1",
            document_id="11111111-1111-1111-1111-111111111111",
            chunk_id="22222222-2222-2222-2222-222222222222",
            content="First chunk with sufficient text to consume the budget.",
            document_name="Doc 1",
        )
        s2 = SourceContextItem(
            source_id="S2",
            document_id="11111111-1111-1111-1111-111111111111",
            chunk_id="33333333-3333-3333-3333-333333333333",
            content="Second chunk that should be omitted due to budget limit.",
            document_name="Doc 2",
        )

        context_str, included, tokens = builder.build_context([s1, s2], max_tokens=25)
        # s1 consumes ~20 tokens, so s2 should be omitted
        assert len(included) <= 1


# =====================================================================
# 4. CITATION VALIDATION TESTS
# =====================================================================

class TestCitationValidator:
    def test_strips_hallucinated_citations(self):
        sources = [
            SourceContextItem(
                source_id="S1",
                document_id="11111111-1111-1111-1111-111111111111",
                chunk_id="22222222-2222-2222-2222-222222222222",
                content="Valid content.",
                document_name="Doc 1",
            )
        ]

        # Model cited S1 and non-existent S99
        cited_ids = ["S1", "S99", "S1"]
        sanitized_ids, limitations = CitationValidator.validate_citations(cited_ids, sources)

        assert sanitized_ids == ["S1"]
        assert len(limitations) == 1
        assert "S99" in limitations[0]


# =====================================================================
# 5. RESPONSE GENERATION SERVICE TESTS
# =====================================================================

class TestResponseGenerationService:
    @pytest.mark.asyncio
    async def test_empty_sources_fast_path(self):
        mock_provider = MockLLMProvider()
        service = ResponseGenerationService(provider=mock_provider)

        request = InternalLLMGenerateRequest(
            organization_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            query="What is the remote work policy?",
            sources=[],
        )

        result = await service.generate_response(request)
        assert result.insufficient_evidence is True
        assert len(result.cited_source_ids) == 0
        assert mock_provider.call_count == 0  # Fast-path does not call LLM

    @pytest.mark.asyncio
    async def test_successful_grounded_generation(self):
        mock_provider = MockLLMProvider()
        service = ResponseGenerationService(provider=mock_provider)

        request = InternalLLMGenerateRequest(
            organization_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            query="What is the password policy?",
            sources=[
                SourceContextItem(
                    source_id="S1",
                    document_id="11111111-1111-1111-1111-111111111111",
                    chunk_id="22222222-2222-2222-2222-222222222222",
                    content="Passwords must be at least 14 characters long.",
                    document_name="Security Standard",
                )
            ],
        )

        result = await service.generate_response(request)
        assert result.insufficient_evidence is False
        assert "S1" in result.cited_source_ids
        assert result.metadata.provider == "mock"
        assert result.metadata.latency_ms is not None
        assert mock_provider.call_count == 1

    @pytest.mark.asyncio
    async def test_fabricated_citation_sanitization(self):
        # Force mock provider to return hallucinated citation S99
        mock_provider = MockLLMProvider(force_invalid_citations=["S1", "S99"])
        service = ResponseGenerationService(provider=mock_provider)

        request = InternalLLMGenerateRequest(
            organization_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            query="What is the policy?",
            sources=[
                SourceContextItem(
                    source_id="S1",
                    document_id="11111111-1111-1111-1111-111111111111",
                    chunk_id="22222222-2222-2222-2222-222222222222",
                    content="Official policy text.",
                    document_name="Policy Doc",
                )
            ],
        )

        result = await service.generate_response(request)
        # S99 should be stripped, only S1 retained
        assert result.cited_source_ids == ["S1"]
        assert any("S99" in lim for lim in result.limitations)


# =====================================================================
# 6. INTERNAL API ROUTER TESTS
# =====================================================================

class TestInternalLLMRouter:
    @pytest.mark.asyncio
    async def test_missing_auth_header_rejected(self):
        from httpx import AsyncClient, ASGITransport
        from app.main import app

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            res = await client.post(
                "/internal/v1/llm/generate",
                json={
                    "organization_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    "query": "Test query?",
                    "sources": [],
                },
            )
            assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_successful_generate_endpoint(self):
        from httpx import AsyncClient, ASGITransport
        from app.main import app
        from app.config.settings import settings

        # Inject mock provider into factory
        set_llm_provider(MockLLMProvider())

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            headers = {"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"}
            res = await client.post(
                "/internal/v1/llm/generate",
                headers=headers,
                json={
                    "organization_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    "query": "How to reset password?",
                    "sources": [
                        {
                            "source_id": "S1",
                            "document_id": "11111111-1111-1111-1111-111111111111",
                            "chunk_id": "22222222-2222-2222-2222-222222222222",
                            "content": "Reset password in profile.",
                            "document_name": "Handbook.pdf",
                            "page_start": 5,
                            "page_end": 5,
                            "section_title": "Security",
                        }
                    ],
                },
            )
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert "answer" in data["data"]
            assert data["data"]["cited_source_ids"] == ["S1"]
            assert data["data"]["metadata"]["provider"] == "mock"
