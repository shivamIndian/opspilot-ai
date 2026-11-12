"""Node for synthesizing final grounded answer incorporating multi-step tool findings and proposals."""

import logging
from typing import Dict, Any, List
from langchain_core.runnables import RunnableConfig

from app.agents.state import OpsPilotWorkflowState
from app.llm.provider_factory import get_llm_provider
from app.llm.schemas import StructuredAnswer

logger = logging.getLogger(__name__)


async def generate_final_response_node(
    state: OpsPilotWorkflowState,
    config: RunnableConfig,
) -> Dict[str, Any]:
    """Synthesizes the final grounded answer incorporating multi-step observations, citations, and proposals."""
    # 0. Resumed Human-in-the-Loop decision scenario (Module 14)
    if state.get("human_approval_decision") == "approved":
        exec_res = state.get("execution_result") or {}
        num = exec_res.get("ticket_number") or exec_res.get("ticket_id") or "confirmed"
        answer = f"The proposed action has been approved and executed successfully. Target entity: Ticket #{num}."
        return {
            "current_node": "generate_final_response",
            "generated_answer": answer,
            "final_response": answer,
            "workflow_status": "completed",
            "insufficient_evidence": False,
        }
    elif state.get("human_approval_decision") == "rejected":
        reason = state.get("approval_decision_reason") or "No justification provided."
        answer = f"The proposed operational action was rejected by human operator. Reason: {reason}"
        return {
            "current_node": "generate_final_response",
            "generated_answer": answer,
            "final_response": answer,
            "workflow_status": "rejected",
            "insufficient_evidence": False,
        }

    # 1. Policy blocked scenario
    if not state.get("policy_approved", True):
        reason = state.get("policy_reason", "Requested action blocked by organization policy.")
        answer = f"I cannot complete this request: {reason}"
        return {
            "current_node": "generate_final_response",
            "generated_answer": answer,
            "final_response": answer,
            "workflow_status": "blocked",
            "insufficient_evidence": False,
        }

    # 2. Check for plan validation or setup errors
    if state.get("error_code") and state.get("workflow_status") in ("failed", "blocked"):
        err = state.get("error_code")
        reason = state.get("policy_reason") or "Workflow execution halted due to validation failure."
        answer = f"The requested workflow could not be completed ({err}): {reason}"
        return {
            "current_node": "generate_final_response",
            "generated_answer": answer,
            "final_response": answer,
            "insufficient_evidence": False,
        }

    query = state.get("normalized_query") or state.get("original_query", "")
    intent = state.get("intent", "general_question")
    tool_results = state.get("tool_results") or {}
    completed_steps = state.get("completed_steps") or []
    action_proposal = state.get("action_proposal")
    retrieved_sources = state.get("retrieved_sources") or []
    insufficient_evidence = state.get("insufficient_evidence", False)

    # 3. Direct general inquiry without tools (0 steps)
    if not completed_steps and not tool_results:
        if intent == "unsupported_request":
            answer = "I am OpsPilot AI. That request is outside the supported operational capabilities. I can only assist with verified organizational IT, support tickets, and corporate documentation."
            return {
                "current_node": "generate_final_response",
                "generated_answer": answer,
                "final_response": answer,
                "workflow_status": "completed",
            }

        # Use LLM provider for conversational response
        provider = get_llm_provider()
        messages = [
            {"role": "system", "content": "You are OpsPilot AI, an enterprise IT operational assistant. Answer clearly and concisely."},
            {"role": "user", "content": query},
        ]
        try:
            text, _ = await provider.generate(messages=messages, temperature=0.2)
        except Exception as e:
            logger.warning(f"[generate_final_response] LLM generation failed: {e}. Using fallback response.")
            text = f"OpsPilot AI is ready to assist. Regarding your query: '{query}', please specify if you need documentation search, ticket management, or system status."
        return {
            "current_node": "generate_final_response",
            "generated_answer": text,
            "final_response": text,
            "workflow_status": "completed",
        }

    # 4. Multi-step execution synthesis
    answer_parts: List[str] = []

    # Summarize read observations
    knowledge_chunks = []
    ticket_summaries = []
    user_summaries = []

    for step_id, res in tool_results.items():
        if not isinstance(res, dict):
            continue

        # Check knowledge chunks / passages
        if "passages" in res or "chunks" in res:
            passages = res.get("passages") or res.get("chunks") or []
            if passages:
                knowledge_chunks.extend(passages)
            else:
                insufficient_evidence = True

        # Check ticket details
        if "ticket_number" in res:
            num = res.get("ticket_number")
            title = res.get("title", "Untitled")
            status = res.get("status", "unknown")
            priority = res.get("priority", "medium")
            ticket_summaries.append(f"Ticket #{num} ('{title}') is {status} with {priority} priority.")

        # Check support history
        if "history_records" in res or "records" in res:
            records = res.get("history_records") or res.get("records") or []
            ticket_summaries.append(f"Retrieved {len(records)} recent support activity record(s) for your organization.")

        # Check user info
        if "users" in res:
            users = res.get("users", [])
            user_names = ", ".join([u.get("name", "User") for u in users[:5]])
            user_summaries.append(f"Found {len(users)} matching organization member(s): {user_names}.")

    # Include specific findings
    if ticket_summaries:
        answer_parts.extend(ticket_summaries)
    if user_summaries:
        answer_parts.extend(user_summaries)

    # Report action proposal if generated
    if action_proposal:
        prop_id = action_proposal.get("proposal_id")
        tool_name = action_proposal.get("tool_name", "action")
        risk = action_proposal.get("risk_level", "medium")
        proposed_action = action_proposal.get("proposed_action") or {}
        subject = proposed_action.get("subject") or proposed_action.get("title") or "Support Ticket"

        answer_parts.append(
            f"Action Proposal Created ({tool_name}): Prepared proposal for '{subject}' "
            f"(Proposal ID: {prop_id}, Risk Level: {risk}). Approval is required before this action can be executed in production."
        )

    # If knowledge chunks retrieved, generate grounded synthesis
    if knowledge_chunks:
        try:
            provider = get_llm_provider()
            context_str = "\n".join([f"[S{i+1}] {c.get('content', '')}" for i, c in enumerate(knowledge_chunks[:5])])
            messages = [
                {"role": "system", "content": "You are OpsPilot AI. Answer the question using ONLY the provided documentation context. Always cite sources as [S1], [S2]."},
                {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {query}"},
            ]
            text, _ = await provider.generate(messages=messages, temperature=0.0)
            answer_parts.insert(0, text)
        except Exception as e:
            logger.warning(f"[generate_final_response] Grounded synthesis error: {e}. Using raw passages.")
            contents = [p.get("content") for p in knowledge_chunks if isinstance(p, dict) and p.get("content")]
            if contents:
                answer_parts.insert(0, " ".join(contents[:2]))

    final_text = " ".join(answer_parts) if answer_parts else "Workflow completed all operational steps successfully."

    return {
        "current_node": "generate_final_response",
        "generated_answer": final_text,
        "final_response": final_text,
        "workflow_status": "awaiting_approval" if action_proposal else "completed",
        "insufficient_evidence": insufficient_evidence,
    }
