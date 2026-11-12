# Human-in-the-Loop Approval Architecture

## 1. Overview & Architectural Goals

The OpsPilot AI Human-in-the-Loop (HITL) system bridges autonomous agent reasoning with enterprise governance, risk mitigation, and compliance. Autonomous systems must never perform mutating operations (such as creating or closing high-priority operational tickets, executing infrastructure changes, or reassigning organizational resources) without authorized human approval.

The architecture enforces strict separation of concerns:
1. **Proposal Generation (AI Service / LangGraph):** The agent identifies required operational mutations, structures the proposed action payload, determines the risk tier, and generates a non-executing proposal.
2. **State Suspension:** LangGraph suspends the execution thread using `interrupt()` and persists thread state to PostgreSQL checkpointer tables (`ai.checkpoints`).
3. **Governance & Decision (Core API / React Web):** Human reviewers inspect the structured diff, evaluate policy implications, and record approval, rejection, or cancellation with Maker-Checker policy enforcement.
4. **Idempotent Execution Gateway:** Approved mutations are executed strictly by authorized Node.js services (e.g., Module 05 `TicketService`), never by direct database mutations from Python.
5. **Durable Resumption (Outbox Worker):** A transactional outbox worker picks up approval events using `FOR UPDATE SKIP LOCKED`, dispatches execution, and signals the AI service to resume the suspended thread with execution output via `Command(resume=...)`.

---

## 2. System Topology

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Operator
    participant Graph as LangGraph Agent (AI Service)
    participant ToolGW as Tool Gateway (Node API)
    participant DB as PostgreSQL (app + ai schemas)
    participant Inbox as Approval Inbox (React Web)
    actor Approver as Admin / Reviewer
    participant OutboxWorker as Outbox Worker (Node.js)
    participant ExecGW as Execution Gateway (Node.js)

    User->>Graph: "Open high priority ticket for database failover"
    Graph->>ToolGW: POST /internal/v1/agent-tools/tickets/create-proposal
    ToolGW->>DB: INSERT INTO app.agent_action_proposals (status='awaiting_approval')
    ToolGW-->>Graph: Return proposal metadata
    Graph->>Graph: await_human_approval node calls interrupt()
    Note over Graph,DB: Thread paused; state saved to ai.checkpoints

    Approver->>Inbox: Views pending proposal in Approval Inbox
    Approver->>Inbox: Reviews diff & clicks "Approve"
    Inbox->>ToolGW: POST /api/v1/organizations/:id/agent/approvals/:id/approve
    ToolGW->>DB: Atomic Tx: update proposal='approved', insert approval & outbox event
    ToolGW-->>Inbox: 200 OK (Proposal Approved)

    loop Transactional Polling (FOR UPDATE SKIP LOCKED)
        OutboxWorker->>DB: Fetch pending outbox events
        OutboxWorker->>ExecGW: POST /internal/v1/agent-proposals/:id/execute
        ExecGW->>DB: TicketService.createTicket() & record execution record
        ExecGW-->>OutboxWorker: Execution result (Ticket #1042)
        OutboxWorker->>Graph: POST /internal/v1/agent/workflows/resume
        OutboxWorker->>DB: Mark outbox event completed
    end

    Graph->>Graph: graph.ainvoke(Command(resume=payload))
    Graph->>Graph: generate_final_response with ticket citation
    Graph-->>User: "Ticket #1042 created successfully and confirmed."
```

---

## 3. Schema Ownership & Separation

OpsPilot maintains strict database schema ownership boundaries:
* **`app` Schema (Owned by Node.js Core API):**
  * `app.agent_action_proposals`: Proposal metadata, action type, tool name, risk level, payload, and status.
  * `app.agent_action_approvals`: Reviewer decision, timestamp, decider user ID, and justification notes.
  * `app.agent_action_executions`: Idempotency keys, execution status, target entity references, and output payloads.
  * `app.agent_workflow_outbox`: Transactional outbox events for asynchronous dispatch and guaranteed delivery.
* **`ai` Schema (Owned by Python AI Service):**
  * `ai.checkpoints`: Serialized thread state snapshots persisted across graph suspension and resumption.
  * `ai.checkpoint_writes`: Intermediate step deltas and channel writes.
  * `ai.workflow_runs`: Workflow run history, tokens, step durations, and intent classification.

---

## 4. Key Architectural Guarantees

| Guarantee | Mechanism | Benefit |
| :--- | :--- | :--- |
| **Zero Direct Python DB Mutations** | Mutation tools output proposals only; executions run through Node.js business services. | Preserves business invariants, audit logging, and authorization models. |
| **Maker-Checker Enforcement** | `MakerCheckerService` rejects self-approval on HIGH/CRITICAL actions. | Prevents rogue agent exploitation or unauthorized single-party escalations. |
| **At-Least-Once Delivery** | Transactional outbox pattern with exponential backoff retry. | Prevents silent failures or dropped approvals during network splits. |
| **Exactly-Once Execution** | Idempotency keys on `app.agent_action_executions`. | Eliminates duplicate ticket generation or double mutations. |
| **Stateful Workflow Resumption** | LangGraph thread checkpointer with `Command(resume=...)`. | The agent retains full conversational context and previous tool observations upon wakeup. |
