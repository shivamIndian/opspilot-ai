# Workflow State Management

## Overview

State management in OpsPilot AI separates **mutable graph execution state** from **immutable trusted runtime context**. This separation prevents sensitive credentials, tenant authorization tokens, and API secrets from ever entering checkpoints, event logs, or persistence stores.

---

## State Schema (`OpsPilotWorkflowState`)

The graph execution state is declared as a Python `TypedDict` in `apps/ai-service/app/agents/state.py`. Every field is strictly typed and managed across node transitions.

```python
class OpsPilotWorkflowState(TypedDict, total=False):
    # Core identifiers
    run_id: str
    thread_id: str
    organization_id: str
    workflow_version: str

    # Input and operational progression
    query: str
    current_node: str
    completed_nodes: List[str]
    intent: Optional[str]

    # Execution plan & policy verification
    plan: Optional[Dict[str, Any]]
    policy_approved: bool
    policy_reason: Optional[str]
    selected_tool: Optional[str]
    tool_arguments: Optional[Dict[str, Any]]

    # Tool outcomes & proposals
    tool_result: Optional[Dict[str, Any]]
    action_proposal: Optional[Dict[str, Any]]

    # Knowledge retrieval
    retrieved_documents: List[Dict[str, Any]]
    insufficient_evidence: bool

    # Response generation & verification
    draft_response: Optional[str]
    final_response: Optional[str]
    citations: List[Dict[str, Any]]

    # Status & error tracking
    status: str  # running, completed, awaiting_approval, blocked, failed
    error_code: Optional[str]
    error_message: Optional[str]
    total_duration_ms: Optional[float]
```

### State Filtering Invariant

LangGraph enforces strict state validation. Any dictionary key returned by a node that is not explicitly declared on `OpsPilotWorkflowState` is stripped. Therefore, any operational signal (such as `error_code` or `insufficient_evidence`) must be explicitly declared in `OpsPilotWorkflowState`.

---

## Runtime Context Schema (`WorkflowContext`)

The runtime context is defined as an immutable dataclass in `apps/ai-service/app/agents/context.py`. It is passed into LangGraph node invocations via `config["configurable"]["context"]`.

```python
@dataclass(frozen=True)
class WorkflowContext:
    organization_id: str
    authenticated_user_id: str
    delegated_authorization_token: str
    permitted_scopes: List[str]
    organization_role: str = "member"
    request_id: Optional[str] = None
    correlation_id: Optional[str] = None

    def has_scope(self, scope: str) -> bool:
        return scope in self.permitted_scopes

    def to_tool_execution_context(self) -> Dict[str, Any]:
        return {
            "organization_id": self.organization_id,
            "user_id": self.authenticated_user_id,
            "role": self.organization_role,
            "delegation_token": self.delegated_authorization_token,
            "scopes": self.permitted_scopes,
            "request_id": self.request_id,
        }
```

### Context Security Invariant

Because `WorkflowContext` is stored in the execution configuration rather than the graph state:

1. It is accessible to nodes that need to invoke authenticated external tools (`execute_readonly_tool`, `propose_mutation`).
2. It is **never written to the checkpointer database** (`ai.agent_checkpoints`).
3. If a workflow state is inspected or resumed from a database snapshot, authorization tokens are not leaked.
