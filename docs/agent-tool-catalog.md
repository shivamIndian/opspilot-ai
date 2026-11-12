# Approved Agent Tool Catalog

The OpsPilot AI Agent framework exposes 6 enterprise business tools.

| Tool Name                   | Category  | Risk Level | Execution Mode  | Approval Required | Scopes Required        | Idempotent |
| :-------------------------- | :-------- | :--------- | :-------------- | :---------------- | :--------------------- | :--------- |
| `search_knowledge_base`     | knowledge | Low        | `read_only`     | No                | `tools:knowledge:read` | Yes        |
| `get_ticket_details`        | tickets   | Medium     | `read_only`     | No                | `tools:tickets:read`   | Yes        |
| `create_support_ticket`     | tickets   | High       | `proposal_only` | **Yes**           | `tools:tickets:write`  | No         |
| `update_support_ticket`     | tickets   | High       | `proposal_only` | **Yes**           | `tools:tickets:write`  | No         |
| `search_user_information`   | users     | Medium     | `read_only`     | No                | `tools:users:read`     | Yes        |
| `summarize_support_history` | tickets   | Medium     | `read_only`     | No                | `tools:history:read`   | Yes        |

---

## 1. `search_knowledge_base`

- **Purpose**: Executes hybrid semantic/keyword search across authorized organization documents using the Module 09 RAG retrieval engine.
- **Input Schema**:
  ```json
  {
    "query": "string (min 1, max 2000)",
    "top_k": "integer (1-20, default 5)",
    "retrieval_mode": "string (enum: 'hybrid' | 'semantic' | 'keyword')"
  }
  ```
- **Output Schema**:
  ```json
  {
    "result_count": 1,
    "query": "VPN setup",
    "retrieval_mode": "hybrid",
    "passages": [
      {
        "chunk_id": "uuid",
        "document_id": "uuid",
        "document_name": "Network Policy.pdf",
        "page_start": 2,
        "page_end": 3,
        "section_title": "VPN Configuration",
        "content": "Verified passage content...",
        "relevance_score": 0.94
      }
    ]
  }
  ```

---

## 2. `get_ticket_details`

- **Purpose**: Retrieves full details of a specific ticket within the caller's organization. Enforces tenant boundary and role-based visibility.
- **Input Schema**:
  ```json
  {
    "ticket_id": "uuid"
  }
  ```
- **Output Schema**:
  ```json
  {
    "ticket_id": "uuid",
    "organization_id": "uuid",
    "ticket_number": 104,
    "title": "Database latency spike",
    "description": "Read queries taking over 2 seconds",
    "status": "open",
    "priority": "high",
    "category": "technical_support",
    "created_by": "uuid",
    "assigned_to": "uuid",
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601"
  }
  ```

---

## 3. `create_support_ticket` (Mutation Proposal)

- **Purpose**: Prepares a validated support ticket creation proposal awaiting human operator approval.
- **Input Schema**:
  ```json
  {
    "title": "string (3-200 chars)",
    "description": "string (5-5000 chars)",
    "category": "string (technical, billing, account, feature_request)",
    "priority": "string (low, medium, high, urgent)"
  }
  ```
- **Output Schema (`ToolActionProposal`)**:
  ```json
  {
    "proposal_id": "uuid",
    "organization_id": "uuid",
    "requested_by": "uuid",
    "tool_name": "create_support_ticket",
    "risk_level": "high",
    "approval_required": true,
    "execution_mode": "proposal_only",
    "status": "awaiting_approval",
    "proposed_action": {
      "action": "create_ticket",
      "title": "Service Outage",
      "description": "API returning 500 errors",
      "category": "technical",
      "priority": "urgent"
    },
    "created_at": "ISO-8601"
  }
  ```

---

## 4. `update_support_ticket` (Mutation Proposal)

- **Purpose**: Prepares a validated ticket modification proposal.
- **Input Schema**:
  ```json
  {
    "ticket_id": "uuid",
    "title": "optional string",
    "description": "optional string",
    "priority": "optional string (low, medium, high, urgent)",
    "category": "optional string",
    "status": "optional string (open, in_progress, resolved, closed)"
  }
  ```
- **Output Schema (`ToolActionProposal`)**:
  ```json
  {
    "proposal_id": "uuid",
    "organization_id": "uuid",
    "requested_by": "uuid",
    "tool_name": "update_support_ticket",
    "risk_level": "high",
    "approval_required": true,
    "execution_mode": "proposal_only",
    "status": "awaiting_approval",
    "proposed_action": {
      "action": "update_ticket",
      "ticket_id": "uuid",
      "changes": {
        "priority": "urgent"
      }
    },
    "created_at": "ISO-8601"
  }
  ```

---

## 5. `search_user_information`

- **Purpose**: Discovers organization members for assignment or contact. Implements strict data minimization: returns only user ID, name, role, and membership status. Never returns passwords, hashes, MFA secrets, or authentication tokens.
- **Input Schema**:
  ```json
  {
    "query": "optional string",
    "role": "optional string (owner, admin, member, viewer)",
    "limit": "integer (1-50, default 10)"
  }
  ```
- **Output Schema**:
  ```json
  {
    "total_found": 2,
    "users": [
      {
        "user_id": "uuid",
        "name": "Alice Smith",
        "role": "admin",
        "status": "active"
      }
    ]
  }
  ```

---

## 6. `summarize_support_history`

- **Purpose**: Aggregates past ticket activity or organization interaction history to provide situational awareness for customer context. Masks confidential/private internal notes.
- **Input Schema**:
  ```json
  {
    "ticket_id": "optional uuid",
    "user_id": "optional uuid",
    "status_filter": "optional string",
    "limit": "integer (1-50, default 10)"
  }
  ```
- **Output Schema**:
  ```json
  {
    "total_records": 1,
    "history_records": [
      {
        "item_id": "uuid",
        "ticket_id": "uuid",
        "activity_type": "priority_updated",
        "summary": "Action priority_updated performed by Lead Admin",
        "actor_id": "uuid",
        "created_at": "ISO-8601"
      }
    ]
  }
  ```
