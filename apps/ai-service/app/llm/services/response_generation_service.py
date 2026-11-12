"""RAG Response Generation Service coordinating context building, prompt rendering, provider invocation, and citation validation."""

import logging
from typing import Optional

from app.config.settings import settings
from app.llm.base import LLMProvider
from app.llm.schemas import (
    InternalLLMGenerateRequest,
    InternalLLMGenerateData,
    StructuredAnswer,
    LLMUsage,
)
from app.llm.services.context_builder import ContextBuilder
from app.llm.services.prompt_manager import get_prompt_manager
from app.llm.services.citation_validator import CitationValidator
from app.llm.services.usage_tracker import UsageTracker
from app.llm.provider_factory import get_llm_provider

logger = logging.getLogger(__name__)


class ResponseGenerationService:
    """Orchestrates RAG context formatting, prompt construction, LLM generation, and citation validation."""

    def __init__(
        self,
        provider: Optional[LLMProvider] = None,
        context_builder: Optional[ContextBuilder] = None,
    ):
        self._provider = provider
        self.context_builder = context_builder or ContextBuilder(
            default_max_tokens=settings.LLM_MAX_CONTEXT_TOKENS,
            model=settings.LLM_MODEL,
        )
        self.prompt_manager = get_prompt_manager()

    def get_provider(self) -> LLMProvider:
        if self._provider is not None:
            return self._provider
        return get_llm_provider()

    async def generate_response(
        self,
        request: InternalLLMGenerateRequest,
    ) -> InternalLLMGenerateData:
        """Executes full RAG response generation lifecycle."""
        provider = self.get_provider()
        tracker = UsageTracker(
            provider=provider.provider_name,
            model=provider.model,
            prompt_version=request.prompt_version,
            retrieval_mode=request.retrieval_mode,
        ).start()

        # Case 1: Fast-path for empty sources
        if not request.sources:
            tracker.stop(LLMUsage())
            return InternalLLMGenerateData(
                request_id=request.request_id,
                answer="I could not find sufficient information in your organization's available documents to answer this question.",
                cited_source_ids=[],
                insufficient_evidence=True,
                limitations=["No relevant supporting documents were found in the knowledge base."],
                follow_up_questions=[],
                metadata=tracker.to_metadata(),
            )

        # Build token-bounded structured context
        formatted_context, included_sources, _ = self.context_builder.build_context(
            sources=request.sources,
            max_tokens=settings.LLM_MAX_CONTEXT_TOKENS,
        )

        # Build prompt messages
        messages = self.prompt_manager.build_messages(
            query=request.query,
            formatted_context=formatted_context,
            system_version=request.prompt_version,
        )

        # Call provider for schema-validated structured output
        raw_answer, usage = await provider.generate_structured(
            messages=messages,
            response_schema=StructuredAnswer,
            max_tokens=request.max_output_tokens,
            temperature=request.temperature,
        )

        # Validate cited source IDs against included sources
        valid_cids, citation_limitations = CitationValidator.validate_citations(
            cited_ids=raw_answer.cited_source_ids,
            available_sources=included_sources,
        )

        # Combine limitations
        all_limitations = list(raw_answer.limitations)
        all_limitations.extend(citation_limitations)

        tracker.stop(usage)

        return InternalLLMGenerateData(
            request_id=request.request_id,
            answer=raw_answer.answer,
            cited_source_ids=valid_cids,
            insufficient_evidence=raw_answer.insufficient_evidence,
            limitations=all_limitations,
            follow_up_questions=raw_answer.follow_up_questions,
            metadata=tracker.to_metadata(),
        )
