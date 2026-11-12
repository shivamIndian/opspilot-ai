"""Node for generating grounded, contextual responses from tool outputs and evidence."""

import logging
from typing import Dict, Any, Optional
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.agents.context import WorkflowContext
from app.llm.provider_factory import get_llm_provider
from app.llm.schemas import StructuredAnswer

logger = logging.getLogger(__name__)


async def generate_response_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Generates evidence-grounded answer or operational summary based on workflow state."""
    route_target = state.get("route_target", "")
    workflow_status = state.get("workflow_status", "")
    query = state.get("normalized_query") or state.get("original_query", "")

    # 1. Blocked branch
    if workflow_status == "blocked" or route_target == "policy_blocked":
        err_msg = state.get("execution_error", {}).get("message", "Action blocked by security policy")
        return {
            "current_node": "generate_response",
            "generated_answer": f"I cannot complete this request: {err_msg}.",
        }

    # 2. Mutation proposal branch
    if workflow_status == "awaiting_approval" or route_target == "propose_mutation":
        action_data = state.get("proposed_action") or {}
        action_type = action_data.get("action", "operation")
        proposal_id = state.get("proposal_id", "")
        return {
            "current_node": "generate_response",
            "generated_answer": (
                f"I have prepared a proposal to {action_type.replace('_', ' ')} (Proposal ID: {proposal_id}). "
                "In accordance with enterprise safety policies, human approval is required before this action can be executed."
            ),
        }

    # 3. Knowledge retrieval branch
    if route_target == "knowledge_retrieval":
        if state.get("insufficient_evidence", False):
            return {
                "current_node": "generate_response",
                "generated_answer": "I could not find sufficient information in your organization's available documents to answer this question.",
            }

        # Build context from retrieved sources
        sources = state.get("retrieved_sources") or []
        formatted_context_parts = []
        for i, s in enumerate(sources, 1):
            s_id = f"S{i}"
            doc_name = s.get("document_name", "Untitled")
            content = s.get("content", "")
            formatted_context_parts.append(f"[{s_id}] ({doc_name}): {content}")

        context_block = "\n\n".join(formatted_context_parts)
        user_prompt = (
            f"<retrieved_context>\n{context_block}\n</retrieved_context>\n\n"
            f"User Question: {query}\n\n"
            "Provide a grounded, factual answer citing source identifiers (e.g. S1, S2)."
        )

        try:
            provider = get_llm_provider()
            ans, _ = await provider.generate_structured(
                messages=[
                    {"role": "system", "content": "You are OpsPilot AI. Answer questions using only the provided <retrieved_context>."},
                    {"role": "user", "content": user_prompt},
                ],
                response_schema=StructuredAnswer,
                temperature=0.1,
            )
            return {
                "current_node": "generate_response",
                "generated_answer": ans.answer,
            }
        except Exception as e:
            logger.error(f"[WorkflowNode:generate_response] Answer generation failed: {e}")
            return {
                "current_node": "generate_response",
                "generated_answer": "An error occurred while synthesizing the answer from retrieved documentation.",
                "workflow_status": "failed",
                "error_code": "WORKFLOW_LLM_UNAVAILABLE",
            }

    # 4. Read-only tool execution branch
    if route_target == "execute_readonly_tool":
        tool_res = state.get("tool_result") or {}
        tool_name = state.get("selected_tool", "")

        if tool_name == "get_ticket_details":
            title = tool_res.get("title", "Untitled")
            status = tool_res.get("status", "unknown")
            priority = tool_res.get("priority", "medium")
            num = tool_res.get("ticket_number", "")
            answer = f"Ticket #{num} ('{title}') is currently {status} with {priority} priority."
        elif tool_name == "search_user_information":
            users = tool_res.get("users", [])
            user_count = len(users)
            user_names = ", ".join([u.get("name", "User") for u in users[:5]])
            answer = f"Found {user_count} matching organization member(s): {user_names}."
        elif tool_name == "summarize_support_history":
            records = tool_res.get("history_records") or tool_res.get("records", [])
            answer = f"Retrieved {len(records)} recent support activity record(s) for your organization."
        else:
            answer = f"Tool '{tool_name}' executed successfully."

        return {
            "current_node": "generate_response",
            "generated_answer": answer,
        }

    # 5. Clarification branch
    if route_target == "needs_clarification":
        req_info = state.get("classification", {}).get("required_information", [])
        info_str = f" Please provide: {', '.join(req_info)}." if req_info else ""
        return {
            "current_node": "generate_response",
            "generated_answer": f"I need more information to process your request.{info_str}",
        }

    # 6. Unsupported request branch
    if route_target == "unsupported_request":
        return {
            "current_node": "generate_response",
            "generated_answer": "This request is outside the supported operational capabilities of OpsPilot AI.",
        }

    # 7. General question branch
    return {
        "current_node": "generate_response",
        "generated_answer": "OpsPilot AI is an enterprise support platform. I can assist you with documentation search, ticket lookups, and support workflows.",
    }
