"""Deterministic offline Mock LLM provider for unit tests and simulation."""

import json
import re
from typing import List, Dict, Any, Type, TypeVar, Tuple, Optional
from pydantic import BaseModel

from app.llm.base import LLMProvider
from app.llm.schemas import LLMUsage, StructuredAnswer
from app.llm.exceptions import LLMError, LLMInvalidResponseError

T = TypeVar("T", bound=BaseModel)


class MockLLMProvider(LLMProvider):
    """Deterministic Mock LLM Provider for automated unit testing and offline development."""

    def __init__(
        self,
        model: str = "mock-gpt-4o-mini",
        max_output_tokens: int = 1500,
        temperature: float = 0.0,
        request_timeout: float = 10.0,
        max_retries: int = 1,
        force_error: Optional[LLMError] = None,
        force_invalid_citations: Optional[List[str]] = None,
    ):
        super().__init__(
            model=model,
            max_output_tokens=max_output_tokens,
            temperature=temperature,
            request_timeout=request_timeout,
            max_retries=max_retries,
        )
        self.force_error = force_error
        self.force_invalid_citations = force_invalid_citations
        self.call_count = 0
        self.last_messages: List[Dict[str, str]] = []

    @property
    def provider_name(self) -> str:
        return "mock"

    async def generate(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> Tuple[str, LLMUsage]:
        self.call_count += 1
        self.last_messages = messages

        if self.force_error:
            raise self.force_error

        user_content = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )

        usage = LLMUsage(
            input_tokens=len(user_content) // 4,
            output_tokens=30,
            total_tokens=(len(user_content) // 4) + 30,
        )

        lowered = user_content.lower()
        question_part = user_content.split("Question:")[-1].lower() if "Question:" in user_content else lowered

        if "opspilot" in question_part or "capabilities" in question_part or "assist" in question_part:
            return "OpsPilot AI is an enterprise support platform providing autonomous operational assistance, documentation retrieval, and IT ticket workflows.", usage

        # Grounded answer synthesis for company latency / server policy
        if "latency" in question_part or "server" in question_part or "sla" in question_part or "policy" in question_part:
            return (
                "Based on the company operations and infrastructure policy guidelines [S1], target API latency for production services must remain "
                "under 200ms at the 95th percentile (p95), with automated escalation alerts triggering if latency exceeds 500ms.",
                usage,
            )

        # Grounded answer synthesis for resume / candidate
        if any(w in question_part for w in ["candidate", "experience", "shivam", "developer", "resume", "skills", "kitna", "kitan", "profile"]):
            return (
                "Based on candidate Shivam Sharma's uploaded resume [S1], Shivam Sharma has a total of 5 years and 3 months (5.3 years) "
                "of professional software engineering experience as a Senior Node.js Developer and AI/ML Model Evaluator.",
                usage,
            )

        if "context:" in lowered or "[s1]" in lowered:
            return (
                "Based on the authorized organizational documentation [S1], all processes and requirements follow established operational standards.",
                usage,
            )

        return f"Mock text response for query: {user_content[:50]}...", usage

    async def generate_structured(
        self,
        messages: List[Dict[str, str]],
        response_schema: Type[T],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> Tuple[T, LLMUsage]:
        self.call_count += 1
        self.last_messages = messages

        if self.force_error:
            raise self.force_error

        user_content = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )

        # Extract available source IDs from prompt
        available_source_ids = re.findall(r"\[(S\d+)\]", user_content)
        unique_sources = sorted(list(set(available_source_ids)))

        usage = LLMUsage(
            input_tokens=max(10, len(user_content) // 4),
            output_tokens=45,
            total_tokens=max(10, len(user_content) // 4) + 45,
        )

        # Support Workflow Intent Classification & Planning Schemas
        schema_name = getattr(response_schema, "__name__", "")
        if schema_name == "WorkflowIntentClassification":
            lowered = user_content.lower()
            if "5_step" in lowered or "five_step" in lowered:
                intent_val = "knowledge_question"
            elif "unsupported" in lowered or "hack" in lowered or "bitcoin" in lowered:
                intent_val = "unsupported_request"
            elif "clarif" in lowered or "what do you mean" in lowered or "incomplete" in lowered:
                intent_val = "needs_clarification"
            elif ("create" in lowered or "open" in lowered) and "ticket" in lowered:
                intent_val = "ticket_creation_request"
            elif "update" in lowered and "ticket" in lowered:
                intent_val = "ticket_update_request"
            elif "history" in lowered or "timeline" in lowered:
                intent_val = "support_history_query"
            elif "user" in lowered or "member" in lowered or "team" in lowered:
                intent_val = "user_lookup"
            elif "ticket" in lowered:
                intent_val = "ticket_lookup"
            elif any(w in lowered for w in [
                "password", "policy", "procedure", "vpn", "guide", "docs", "how",
                "candidate", "experience", "resume", "shivam", "skill", "skills",
                "education", "work", "latency", "server", "sla", "document", "upload",
                "kitna", "kitan", "hai"
            ]):
                intent_val = "knowledge_question"
            else:
                intent_val = "general_question"

            instance = response_schema(
                intent=intent_val,
                summary=f"Classified inquiry: {user_content[:60]}",
                urgency="urgent" if "urgent" in lowered else "medium",
                confidence_label="high",
                required_information=["ticket_id"] if intent_val == "needs_clarification" else [],
                expected_action_type="propose_mutation" if "ticket_" in intent_val and ("creation" in intent_val or "update" in intent_val) else "read",
                reasoning_summary="Mock classification matching keywords",
            )
            return instance, usage

        if schema_name == "MultiStepExecutionPlan":
            user_query = user_content
            if "User Query:" in user_content:
                parts = user_content.split("User Query:")[1]
                if "Classified Intent:" in parts:
                    user_query = parts.split("Classified Intent:")[0]
                else:
                    user_query = parts
            lowered = user_query.lower()
            full_lowered = user_content.lower()

            classified_intent = ""
            if "Classified Intent:" in user_content:
                classified_intent = user_content.split("Classified Intent:")[1].split("\n")[0].strip().lower()

            # Check if this is a replanning invocation
            if "reason for revision" in full_lowered or "completed steps" in full_lowered:
                plan = response_schema(
                    objective="Revised operational objective adapting to intermediate observation",
                    steps=[
                        {
                            "step_id": "step_revised_1",
                            "tool_name": "summarize_support_history",
                            "action_type": "read",
                            "arguments": {"limit": 5},
                            "depends_on": [],
                            "expected_output": "Alternative support history summary",
                        }
                    ],
                    reasoning="Revised remaining steps after evaluating intermediate result",
                )
                return plan, usage

            # Check for 5-step test scenario
            if "5_step" in full_lowered or "five_step" in full_lowered:
                plan = response_schema(
                    objective="Execute full 5-step complex operational task",
                    steps=[
                        {
                            "step_id": "step_1",
                            "tool_name": "search_knowledge_base",
                            "action_type": "read",
                            "arguments": {"query": "system runbook", "top_k": 3},
                            "depends_on": [],
                            "expected_output": "System runbook excerpts",
                        },
                        {
                            "step_id": "step_2",
                            "tool_name": "summarize_support_history",
                            "action_type": "read",
                            "arguments": {"limit": 5},
                            "depends_on": ["step_1"],
                            "expected_output": "Recent ticket history",
                        },
                        {
                            "step_id": "step_3",
                            "tool_name": "search_user_information",
                            "action_type": "read",
                            "arguments": {"name": "Alice"},
                            "depends_on": ["step_2"],
                            "expected_output": "User contact details",
                        },
                        {
                            "step_id": "step_4",
                            "tool_name": "get_ticket_details",
                            "action_type": "read",
                            "arguments": {"ticket_number": 1001},
                            "depends_on": ["step_3"],
                            "expected_output": "Existing ticket details",
                        },
                        {
                            "step_id": "step_5",
                            "tool_name": "create_support_ticket",
                            "action_type": "mutation_proposal",
                            "arguments": {"title": "5-step workflow ticket", "subject": "5-step workflow ticket", "description": "Resolved via 5 steps", "priority": "medium"},
                            "depends_on": ["step_4"],
                            "expected_output": "Proposed action proposal",
                        },
                    ],
                    reasoning="5-step end-to-end plan covering all approved tools",
                )
                return plan, usage

            # Composite scenario: Search knowledge, check history, propose ticket
            if ("policy" in lowered or "reset" in lowered or "search" in lowered) and ("ticket" in lowered or "create" in lowered):
                plan = response_schema(
                    objective="Investigate issue, check existing tickets, and propose ticket if needed",
                    steps=[
                        {
                            "step_id": "step_1",
                            "tool_name": "search_knowledge_base",
                            "action_type": "read",
                            "arguments": {"query": "account reset procedure", "top_k": 5, "retrieval_mode": "hybrid"},
                            "depends_on": [],
                            "expected_output": "Account reset procedures",
                        },
                        {
                            "step_id": "step_2",
                            "tool_name": "summarize_support_history",
                            "action_type": "read",
                            "arguments": {"limit": 10},
                            "depends_on": [],
                            "expected_output": "Existing open tickets",
                        },
                        {
                            "step_id": "step_3",
                            "tool_name": "create_support_ticket",
                            "action_type": "mutation_proposal",
                            "arguments": {
                                "title": "Account reset issue",
                                "subject": "Account reset issue",
                                "description": "The account reset procedure is not working.",
                                "category": "account_access",
                                "priority": "medium",
                            },
                            "depends_on": ["step_1", "step_2"],
                            "condition": "Only when no matching existing ticket is found",
                            "expected_output": "Proposed support ticket",
                        },
                    ],
                    reasoning="Structured 3-step investigation and proposal plan",
                )
                return plan, usage

            # Multi-read scenario: 2 read-only tools
            if "two_step" in full_lowered or ("user" in lowered and "ticket" in lowered):
                plan = response_schema(
                    objective="Lookup user information and check ticket details",
                    steps=[
                        {
                            "step_id": "step_1",
                            "tool_name": "search_user_information",
                            "action_type": "read",
                            "arguments": {"name": "Bob"},
                            "depends_on": [],
                            "expected_output": "User profile",
                        },
                        {
                            "step_id": "step_2",
                            "tool_name": "summarize_support_history",
                            "action_type": "read",
                            "arguments": {"limit": 5},
                            "depends_on": ["step_1"],
                            "expected_output": "User's support history",
                        },
                    ],
                    reasoning="2-step read-only verification plan",
                )
                return plan, usage

            # Replan test scenario
            if "replan_test" in full_lowered:
                plan = response_schema(
                    objective="Test bounded replanning with initial step",
                    steps=[
                        {
                            "step_id": "step_1",
                            "tool_name": "search_knowledge_base",
                            "action_type": "read",
                            "arguments": {"query": "fail_search_query"},
                            "depends_on": [],
                            "expected_output": "Initial search result",
                        }
                    ],
                    reasoning="Single step plan designed for replan trigger",
                )
                return plan, usage

            # Single-step lookups
            if classified_intent == "ticket_lookup" or "get_ticket_details" in lowered or ("ticket" in lowered and ("detail" in lowered or "1001" in lowered or "104" in lowered)):
                plan = response_schema(
                    objective="Retrieve ticket details",
                    steps=[
                        {
                            "step_id": "step_1",
                            "tool_name": "get_ticket_details",
                            "action_type": "read",
                            "arguments": {"ticket_id": "22222222-2222-4222-8222-222222222222", "ticket_number": 104 if "104" in lowered else 1001},
                            "depends_on": [],
                            "expected_output": "Ticket details",
                        }
                    ],
                )
            elif classified_intent == "support_history_query" or "history" in lowered:
                plan = response_schema(
                    objective="Summarize support history",
                    steps=[
                        {
                            "step_id": "step_1",
                            "tool_name": "summarize_support_history",
                            "action_type": "read",
                            "arguments": {"limit": 5},
                            "depends_on": [],
                            "expected_output": "Support history records",
                        }
                    ],
                )
            elif classified_intent == "user_lookup" or "search_user" in lowered or "member" in lowered or "alice" in lowered or "bob" in lowered:
                plan = response_schema(
                    objective="Lookup organization user",
                    steps=[
                        {
                            "step_id": "step_1",
                            "tool_name": "search_user_information",
                            "action_type": "read",
                            "arguments": {"name": "Alice"},
                            "depends_on": [],
                            "expected_output": "User details",
                        }
                    ],
                )
            elif (
                classified_intent in ("ticket_creation_request", "ticket_update_request")
                or "create_support_ticket" in lowered
                or ("ticket" in lowered and ("create" in lowered or "open" in lowered))
            ):
                plan = response_schema(
                    objective="Propose ticket creation",
                    steps=[
                        {
                            "step_id": "step_1",
                            "tool_name": "create_support_ticket",
                            "action_type": "mutation_proposal",
                            "arguments": {
                                "title": "Database performance issues" if "database" in lowered else "New Support Ticket",
                                "subject": "Database performance issues" if "database" in lowered else "New Support Ticket",
                                "description": user_query.strip() if len(user_query.strip()) >= 5 else "Ticket description for operational issue",
                                "category": "technical",
                                "priority": "high" if "urgent" in lowered or "latency" in lowered or "database" in lowered else "medium",
                            },
                            "depends_on": [],
                            "expected_output": "Ticket proposal",
                        }
                    ],
                )
            elif classified_intent == "knowledge_question" or any(w in lowered for w in [
                "password", "vpn", "policy", "search", "docs", "manual", "guide",
                "candidate", "experience", "resume", "shivam", "skill", "skills",
                "education", "latency", "server", "sla", "kitna", "kitan"
            ]):
                plan = response_schema(
                    objective="Search organizational documentation",
                    steps=[
                        {
                            "step_id": "step_1",
                            "tool_name": "search_knowledge_base",
                            "action_type": "read",
                            "arguments": {"query": user_query.strip()[:100], "top_k": 5, "retrieval_mode": "hybrid"},
                            "depends_on": [],
                            "expected_output": "Documentation chunks",
                        }
                    ],
                )
            else:
                plan = response_schema(
                    objective="Address direct conversational inquiry without external tools",
                    steps=[],
                )
            return plan, usage

        if schema_name == "WorkflowExecutionPlan":
            lowered = user_content.lower()
            if "create_support_ticket" in lowered or "ticket_creation" in lowered:
                plan = response_schema(
                    intent="ticket_creation_request",
                    objective="Create support ticket proposal",
                    selected_tool="create_support_ticket",
                    tool_arguments={
                        "title": "Mock Ticket Title",
                        "description": "Mock problem description exceeding five chars",
                        "category": "technical",
                        "priority": "medium",
                    },
                    action_type="propose_mutation",
                    requires_approval=True,
                )
            elif "update_support_ticket" in lowered or "ticket_update" in lowered:
                plan = response_schema(
                    intent="ticket_update_request",
                    objective="Update support ticket proposal",
                    selected_tool="update_support_ticket",
                    tool_arguments={
                        "ticket_id": "22222222-2222-4222-8222-222222222222",
                        "priority": "urgent",
                    },
                    action_type="propose_mutation",
                    requires_approval=True,
                )
            elif "get_ticket_details" in lowered or "ticket_lookup" in lowered:
                plan = response_schema(
                    intent="ticket_lookup",
                    objective="Retrieve ticket details",
                    selected_tool="get_ticket_details",
                    tool_arguments={"ticket_id": "22222222-2222-4222-8222-222222222222"},
                    action_type="read",
                    requires_approval=False,
                )
            elif "search_user_information" in lowered or "user_lookup" in lowered:
                plan = response_schema(
                    intent="user_lookup",
                    objective="Lookup organization members",
                    selected_tool="search_user_information",
                    tool_arguments={"query": "Alice", "limit": 5},
                    action_type="read",
                    requires_approval=False,
                )
            elif "summarize_support_history" in lowered or "support_history" in lowered:
                plan = response_schema(
                    intent="support_history_query",
                    objective="Summarize ticket history",
                    selected_tool="summarize_support_history",
                    tool_arguments={"limit": 5},
                    action_type="read",
                    requires_approval=False,
                )
            elif "knowledge_question" in lowered or any(w in lowered for w in ["password", "vpn", "policy", "search"]):
                plan = response_schema(
                    intent="knowledge_question",
                    objective="Search organizational knowledge",
                    selected_tool="search_knowledge_base",
                    tool_arguments={"query": user_content[:100], "top_k": 5, "retrieval_mode": "hybrid"},
                    action_type="read",
                    requires_approval=False,
                )
            else:
                plan = response_schema(
                    intent="general_question",
                    objective="Address general inquiry without tools",
                    selected_tool=None,
                    tool_arguments={},
                    action_type="none",
                    requires_approval=False,
                )
            return plan, usage

        # Check for forced invalid citations test scenario
        if self.force_invalid_citations is not None:
            ans = StructuredAnswer(
                answer="Testing citation validation with fabricated IDs.",
                cited_source_ids=self.force_invalid_citations,
                insufficient_evidence=False,
                limitations=[],
                follow_up_questions=[],
            )
            return ans, usage  # type: ignore[return-value]

        # Case 1: No sources provided or explicitly missing evidence scenario
        if not unique_sources or "no_evidence_test" in user_content.lower():
            ans = StructuredAnswer(
                answer="I could not find sufficient information in your organization's available documents to answer this question.",
                cited_source_ids=[],
                insufficient_evidence=True,
                limitations=["No relevant supporting documents were found in the knowledge base."],
                follow_up_questions=["Would you like to search across all document categories?"],
            )
            return ans, usage  # type: ignore[return-value]

        # Case 2: Contradiction scenario
        if "contradictory" in user_content.lower() or "conflict" in user_content.lower():
            ans = StructuredAnswer(
                answer="The retrieved documents contain conflicting policies regarding this topic.",
                cited_source_ids=unique_sources[:2] if len(unique_sources) >= 2 else unique_sources,
                insufficient_evidence=False,
                limitations=[
                    "Document S1 states 30 days retention while Document S2 states 90 days retention."
                ],
                follow_up_questions=["Which department's data retention policy takes precedence?"],
            )
            return ans, usage  # type: ignore[return-value]

        # Case 3: Prompt injection attempt in document
        if "ignore previous instructions" in user_content.lower() or "system prompt" in user_content.lower():
            ans = StructuredAnswer(
                answer="Company policies require adhering to official operational security procedures.",
                cited_source_ids=unique_sources[:1],
                insufficient_evidence=False,
                limitations=["Ignored untrusted instructional override attempts in document context."],
                follow_up_questions=[],
            )
            return ans, usage  # type: ignore[return-value]

        # Default Case: Grounded answer citing provided sources
        primary_citations = unique_sources[:2] if len(unique_sources) >= 2 else unique_sources
        lowered = user_content.lower()
        if any(w in lowered for w in ["candidate", "experience", "shivam", "developer", "resume", "skills", "kitna", "kitan"]):
            cited_str = " ".join([f"[{s}]" for s in primary_citations]) if primary_citations else "[S1]"
            ans_text = (
                f"Based on candidate Shivam Sharma's uploaded resume {cited_str}, "
                "the candidate has a total of 5 years and 3 months (5.3 years) of professional software engineering experience "
                "as a Senior Node.js Developer and AI/ML Model Evaluator."
            )
        elif "latency" in lowered or "server" in lowered or "sla" in lowered:
            cited_str = " ".join([f"[{s}]" for s in primary_citations]) if primary_citations else "[S1]"
            ans_text = (
                f"Based on authorized corporate documentation {cited_str}, "
                "target API latency for production services must remain under 200ms at the 95th percentile (p95), "
                "with automated escalation alerts triggering if latency exceeds 500ms."
            )
        else:
            ans_text = "Based on authorized corporate documentation, all procedures must follow verified organizational guidelines."

        ans = StructuredAnswer(
            answer=ans_text,
            cited_source_ids=primary_citations if primary_citations else ["S1"],
            insufficient_evidence=False,
            limitations=[],
            follow_up_questions=[
                "Would you like more details on specific sections?",
                "Do you need further information from the source document?",
            ],
        )

        return ans, usage  # type: ignore[return-value]

    async def health_check(self) -> bool:
        if self.force_error:
            raise self.force_error
        return True

    async def close(self) -> None:
        pass
