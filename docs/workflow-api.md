# Agent Workflow API Reference

## Overview

OpsPilot AI provides two API tiers for workflow interaction:

1. **Public Authenticated Gateway**: Exposed by Node.js Express at `/api/v1/organizations/:organizationId/agent/workflows`.
2. **Internal Service API**: Exposed by Python FastAPI at `/internal/v1/agent/workflows`.

---

## Public Gateway Endpoints (Node.js Express)

### 1. Run Workflow

Executes a stateful OpsPilot LangGraph workflow.

- **URL**: `POST /api/v1/organizations/:organizationId/agent/workflows/run`
- **Authentication**: Bearer JWT (`Authorization: Bearer <accessToken>`)
- **Headers**: `Content-Type: application/json`

#### Request Body

```json
{
  "query": "What is our customer onboarding procedure?",
  "workflowVersion": "v1.0",
  "threadId": "11111111-2222-3333-4444-555555555555",
  "correlationId": "req-987654"
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "run_id": "8d39f40c-3591-4cfd-8622-6b216ce707ef",
    "thread_id": "11111111-2222-3333-4444-555555555555",
    "organization_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "status": "completed",
    "intent": "knowledge_search",
    "selected_tool": null,
    "answer": "Our onboarding procedure requires creating a customer profile and setting up SSO.",
    "citations": [
      {
        "chunk_id": "c1",
        "document_id": "d1",
        "filename": "onboarding.pdf",
        "score": 0.92,
        "snippet": "Customer onboarding procedure overview..."
      }
    ],
    "insufficient_evidence": false,
    "requires_approval": false,
    "proposal": null,
    "proposal_id": null,
    "error_code": null,
    "duration_ms": 235.4
  }
}
```

#### Response with Action Proposal (200 OK)

```json
{
  "success": true,
  "data": {
    "run_id": "22222222-3333-4444-5555-666666666666",
    "thread_id": "77777777-8888-9999-aaaa-bbbbbbbbbbbb",
    "organization_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "status": "awaiting_approval",
    "intent": "ticket_creation",
    "selected_tool": "create_support_ticket",
    "answer": "I have created an action proposal to create support ticket 'Database latency spike'.",
    "citations": [],
    "insufficient_evidence": false,
    "requires_approval": true,
    "proposal": {
      "proposal_id": "99999999-aaaa-bbbb-cccc-dddddddddddd",
      "tool_name": "create_support_ticket",
      "proposed_action": {
        "title": "Database latency spike",
        "description": "Database queries exceeding 500ms in us-east-1",
        "priority": "high"
      },
      "risk_level": "medium",
      "requires_approval": true,
      "status": "awaiting_approval"
    },
    "proposal_id": "99999999-aaaa-bbbb-cccc-dddddddddddd",
    "error_code": null,
    "duration_ms": 312.8
  }
}
```

---

### 2. Get Workflow Run Status

Retrieves execution details and current state for a workflow run.

- **URL**: `GET /api/v1/organizations/:organizationId/agent/workflows/:runId`
- **Authentication**: Bearer JWT (`Authorization: Bearer <accessToken>`)

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "run_id": "8d39f40c-3591-4cfd-8622-6b216ce707ef",
    "thread_id": "11111111-2222-3333-4444-555555555555",
    "organization_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "status": "completed",
    "intent": "knowledge_search",
    "selected_tool": null,
    "answer": "Our onboarding procedure requires creating a customer profile and setting up SSO.",
    "citations": [...],
    "insufficient_evidence": false,
    "requires_approval": false,
    "proposal": null,
    "duration_ms": 235.4
  }
}
```

---

## Internal Service Endpoints (Python AI Service)

| Method | Endpoint                                                    | Header                     | Purpose                                        |
| ------ | ----------------------------------------------------------- | -------------------------- | ---------------------------------------------- |
| `POST` | `/internal/v1/agent/workflows/run`                          | `X-Internal-Service-Token` | Initiates graph execution with runtime context |
| `GET`  | `/internal/v1/agent/workflows/{run_id}?organization_id=...` | `X-Internal-Service-Token` | Retrieves workflow run state snapshot          |
