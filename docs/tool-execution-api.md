# AI Agent Tool Execution API Reference

## 1. AI Service Internal Discovery & Execution Endpoints

### 1.1 `GET /internal/v1/tools`

Discovers all registered agent tools and their parameter schemas.

- **Authentication**: `Authorization: Bearer <AI_SERVICE_INTERNAL_TOKEN>`
- **Response**: `HTTP 200 OK`
  ```json
  {
    "success": true,
    "total_tools": 6,
    "tools": [
      {
        "name": "search_knowledge_base",
        "description": "Searches authorized organization knowledge documents...",
        "category": "knowledge",
        "risk_level": "low",
        "approval_required": false,
        "execution_mode": "read_only",
        "required_permissions": ["tools:knowledge:read"],
        "timeout_seconds": 25.0,
        "idempotent": true,
        "enabled": true,
        "parameters_schema": {
          "type": "object",
          "properties": {
            "query": { "type": "string" },
            "top_k": { "type": "integer", "default": 5 },
            "retrieval_mode": { "type": "string", "default": "hybrid" }
          },
          "required": ["query"]
        }
      }
    ]
  }
  ```

---

### 1.2 `POST /internal/v1/tools/execute`

Executes an approved tool within a validated runtime context.

- **Authentication**: `Authorization: Bearer <AI_SERVICE_INTERNAL_TOKEN>`
- **Request Body**:

  ```json
  {
    "tool_name": "create_support_ticket",
    "arguments": {
      "title": "Payment Gateway Timeout",
      "description": "Stripe webhook failing with HTTP 504",
      "category": "technical",
      "priority": "urgent"
    },
    "request_id": "req-12345",
    "execution_id": "exec-67890",
    "authenticated_user_id": "11111111-1111-4111-8111-111111111111",
    "organization_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "delegated_authorization_token": "<jwt-assertion>",
    "permitted_scopes": ["tools:tickets:write"],
    "platform_role": "user",
    "correlation_id": "corr-abcde"
  }
  ```

- **Successful Response (Read Tool)**: `HTTP 200 OK`

  ```json
  {
    "success": true,
    "tool_name": "get_ticket_details",
    "execution_id": "exec-67890",
    "risk_level": "medium",
    "execution_mode": "read_only",
    "data": { ... },
    "duration_ms": 42.5
  }
  ```

- **Successful Response (Proposal Tool)**: `HTTP 200 OK`
  ```json
  {
    "success": true,
    "tool_name": "create_support_ticket",
    "execution_id": "exec-67890",
    "risk_level": "high",
    "execution_mode": "proposal_only",
    "proposal": {
      "proposal_id": "prop-uuid-999",
      "organization_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "requested_by": "11111111-1111-4111-8111-111111111111",
      "tool_name": "create_support_ticket",
      "risk_level": "high",
      "approval_required": true,
      "execution_mode": "proposal_only",
      "proposed_action": {
        "action": "create_ticket",
        "title": "Payment Gateway Timeout",
        "description": "Stripe webhook failing with HTTP 504",
        "category": "technical",
        "priority": "urgent"
      },
      "status": "awaiting_approval",
      "created_at": "2026-11-04T05:30:00Z"
    },
    "duration_ms": 18.2
  }
  ```

---

## 2. Core API Internal Business Tool Gateway Endpoints

Mounted under `http://localhost:4000/internal/v1/agent-tools/*`.

All endpoints require:

- `Authorization: Bearer <AI_SERVICE_INTERNAL_TOKEN>`
- `x-delegation-token: <jwt-assertion>`
- `x-request-id: <uuid>`

| Endpoint                   | Method | Required Scope         | Payload                                      | Response Data                      |
| :------------------------- | :----- | :--------------------- | :------------------------------------------- | :--------------------------------- |
| `/knowledge/search`        | POST   | `tools:knowledge:read` | `{ query, topK, retrievalMode }`             | `{ query, resultCount, passages }` |
| `/tickets/get`             | POST   | `tools:tickets:read`   | `{ ticketId }`                               | Safe ticket object                 |
| `/tickets/create-proposal` | POST   | `tools:tickets:write`  | `{ title, description, category, priority }` | `ToolActionProposal`               |
| `/tickets/update-proposal` | POST   | `tools:tickets:write`  | `{ ticketId, changes }`                      | `ToolActionProposal`               |
| `/users/search`            | POST   | `tools:users:read`     | `{ query, role, limit }`                     | `{ totalFound, users }`            |
| `/support-history/search`  | POST   | `tools:history:read`   | `{ ticketId?, userId?, status?, limit? }`    | `{ totalRecords, records }`        |
