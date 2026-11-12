"""Typed state definition for the OpsPilot LangGraph workflow engine."""

from typing import TypedDict, Optional, List, Dict, Any


class OpsPilotWorkflowState(TypedDict, total=False):
    """Centralized, strictly typed workflow state passed between LangGraph nodes.

    Security Invariant: Never stores credentials, tokens, or raw secrets.
    """

    # Identifiers & Lifecycle
    request_id: str
    run_id: str
    thread_id: str
    organization_id: str
    workflow_status: str  # queued, planning, executing, running, completed, failed, awaiting_approval, blocked, resumed, partially_completed
    current_node: str

    # User Input
    original_query: str
    normalized_query: str

    # Planning & Cognitive State
    intent: Optional[str]
    classification: Optional[Dict[str, Any]]
    objective: Optional[str]
    execution_plan: Optional[Dict[str, Any]]
    current_step_index: int
    total_steps: int
    completed_steps_count: int
    completed_steps: List[str]
    failed_steps: List[str]
    tool_call_count: int
    replan_count: int

    # Policy & Routing
    policy_approved: bool
    policy_reason: Optional[str]
    selected_tool: Optional[str]
    tool_arguments: Optional[Dict[str, Any]]
    route_target: Optional[str]

    # Tool & Retrieval Outcomes
    tool_result: Optional[Dict[str, Any]]
    tool_results: Dict[str, Any]
    retrieved_sources: Optional[List[Dict[str, Any]]]
    retrieval_results: Optional[List[Dict[str, Any]]]
    citation_data: Optional[List[Dict[str, Any]]]
    source_citations: Optional[List[Dict[str, Any]]]

    # Proposals & Human-in-the-Loop Resumption (Module 14)
    requires_approval: bool
    proposed_action: Optional[Dict[str, Any]]
    action_proposal: Optional[Dict[str, Any]]
    proposal_id: Optional[str]
    pending_proposal_ids: List[str]
    completed_proposal_ids: List[str]
    human_approval_decision: Optional[str]
    approval_decided_by: Optional[str]
    approval_decision_reason: Optional[str]
    execution_result: Optional[Dict[str, Any]]

    # Long-Term and Episodic Memory State (Module 15)
    user_id: Optional[str]
    user_memories: Optional[List[Dict[str, Any]]]
    user_memory_context: Optional[str]
    episodic_summary: Optional[str]
    memory_proposals: Optional[List[Dict[str, Any]]]

    # LLM Output & Evidence
    generated_answer: Optional[str]
    final_response: Optional[str]
    insufficient_evidence: bool
    execution_summary: Optional[str]

    # Diagnostics, Telemetry & Errors
    error_code: Optional[str]
    error_message: Optional[str]
    execution_error: Optional[Dict[str, Any]]
    execution_metrics: Optional[Dict[str, Any]]
    started_at: Optional[str]
    updated_at: Optional[str]
