# Approved Action Execution Gateway & Idempotency

## 1. Overview & Service Boundaries

The OpsPilot AI Agent Execution Gateway (`AgentExecutionGatewayService`) is the authoritative execution bridge for approved operational actions. It enforces three fundamental guarantees:

1. **Strict Service-Level Encapsulation:** AI agents never perform raw database insertions or mutations. Approved proposals are executed exclusively by invoking existing core business services (e.g. Module 05 `TicketService`).
2. **Idempotent Mutations:** Repeating an execution request with the same `idempotency_key` returns the cached execution result without re-invoking the underlying business service.
3. **Audit Trail Completeness:** Execution attempts, target entity IDs (e.g., `ticket:1042`), results, and error diagnostics are recorded in `app.agent_action_executions`.

---

## 2. Execution Flow & Idempotency Verification

```mermaid
flowchart TD
    Req[POST /internal/v1/agent-proposals/:id/execute] --> AuthCheck{Valid Service Token?}
    AuthCheck -- No --> Ret401[HTTP 401 UNAUTHORIZED_SERVICE]
    AuthCheck -- Yes --> Find[Lookup proposal in app.agent_action_proposals]
    Find --> Exists{Proposal Exists?}
    Exists -- No --> Ret404[HTTP 404 NOT_FOUND]
    Exists -- Yes --> CheckStatus{Status is approved or executed?}
    CheckStatus -- No --> Ret400[HTTP 400 Invalid Proposal State]
    CheckStatus -- Yes --> CheckExec{Existing execution with status='success'?}
    CheckExec -- Yes --> CacheReturn[Return cached SafeAgentExecution (Idempotent)]
    CheckExec -- No --> StartExec[Record pending execution record]
    StartExec --> ActionType{Action Type}
    
    ActionType -- create_ticket --> TicketCreate[TicketService.createTicket()]
    ActionType -- update_ticket --> TicketUpdate[TicketService.updateTicket()]
    ActionType -- other --> Unsupp[Throw Unsupported Action Type]

    TicketCreate --> SuccessUpdate[Update execution status='success' & proposal='executed']
    TicketUpdate --> SuccessUpdate
    SuccessUpdate --> ReturnExec[Return SafeAgentExecution payload]
```

---

## 3. Idempotency Key Design

Every execution creates an entry in `app.agent_action_executions`:
* The default idempotency key is derived as `exec-${proposal.id}`.
* The table enforces a `UNIQUE (idempotency_key)` constraint.
* If a worker or API consumer triggers duplicate execution calls (for example, due to a network timeout during acknowledgment), the gateway detects the existing successful execution and returns the original result payload without executing a second ticket creation.

---

## 4. Integration with Module 05 Ticket Service

The gateway maps proposal payloads to strongly typed domain parameters:

### Create Ticket Mapping
* **Proposal Action:** `create_ticket` / `create_support_ticket`
* **Service Method:** `TicketService.createTicket(organizationId, requesterUserId, input)`
* **Mapped Fields:**
  * `subject`: `payload.title || payload.subject`
  * `description`: `payload.description`
  * `category`: mapped to valid `TicketCategory` (default: `'technical_support'`)
  * `priority`: mapped to valid `TicketPriority` (`'low'`, `'medium'`, `'high'`, `'urgent'`)
* **Output Capture:** Captures `id`, `ticketNumber`, `status`, and `priority`.

### Update Ticket Mapping
* **Proposal Action:** `update_ticket` / `update_support_ticket`
* **Service Method:** `TicketService.updateTicket(organizationId, ticketId, requesterUserId, 'admin', updateInput)`
* **Mapped Fields:**
  * `priority`: updated priority
  * `status`: updated status (`'open'`, `'in_progress'`, `'resolved'`, `'closed'`)
  * `subject`: updated subject title
* **Output Capture:** Captures `id`, `ticketNumber`, `status`, and `priority`.
