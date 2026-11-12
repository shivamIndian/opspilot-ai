# AI Agent Tool Registry & Execution Architecture

## 1. Overview & Architectural Goals

The **AI Agent Tool Registry & Execution Framework** provides a strongly typed, security-bounded runtime that enables AI agents to discover, evaluate, and execute organizational tools.

```
       +-------------------------------------------------------+
       |             Node.js Core API Orchestrator             |
       |  - Signs Short-Lived JWT Delegation Assertion         |
       |  - Injects Immutable ToolExecutionContext             |
       +---------------------------+---------------------------+
                                   | POST /internal/v1/tools/execute
                                   v
       +-------------------------------------------------------+
       |             Python AI Service Execution Engine        |
       |                                                       |
       |  1. Tool Registry Resolution                          |
       |  2. Administrative Enabled Probe                      |
       |  3. Pydantic Input Schema Validation                  |
       |  4. ToolPolicyEngine Scope & Permission Check         |
       |  5. Sandboxed Async Invocation with Timeout & Retry   |
       |  6. Proposal Enforcement for Mutations                |
       |  7. Sanitizer & Size Constraints (512 KB max)         |
       |  8. Asynchronous Telemetry to PostgreSQL ai schema    |
       +---------------------------+---------------------------+
                                   | POST /internal/v1/agent-tools/*
                                   | (Forwarding Assertion + Service Token)
                                   v
       +-------------------------------------------------------+
       |             Node.js Internal Business Gateway         |
       |  - Verifies AI_SERVICE_INTERNAL_TOKEN                 |
       |  - Verifies JWT Claims (sub, orgId, scopes, aud)      |
       |  - Authoritatively Verifies PostgreSQL Tenant Member   |
       |  - Executes Business Logic or Returns Action Proposal |
       +-------------------------------------------------------+
```

## 2. Core Architectural Principles

### 2.1 Provider Independence & LLM Decoupling

Tools are defined as pure Python classes deriving from `ToolDefinition`. They do not depend on OpenAI, Anthropic, or any single vendor runtime. Any LLM provider can be presented with the tool metadata via standard JSON Schemas.

### 2.2 Separation of Calling Arguments vs. Execution Context

The LLM only specifies operational parameters (e.g., search terms, ticket IDs, category, priority). It is **structurally impossible** for an LLM to supply or spoof:

- `organization_id`
- `user_id`
- `delegated_authorization_token`
- `permitted_scopes`

These parameters reside exclusively in the immutable `ToolExecutionContext` injected by the trusted backend.

### 2.3 Strict Proposal-Only Mutation Contract

Any tool categorized with `ToolExecutionMode.PROPOSAL_ONLY` (such as `create_support_ticket` and `update_support_ticket`) **must never modify persistent database state** during agent execution. Instead, the framework validates all arguments and emits a structured `ToolActionProposal` marked `status: 'awaiting_approval'`, ensuring human-in-the-loop governance.

### 2.4 Multi-Tenant Delegation Boundary

The Python microservice never has direct access to mutate `app` schema tables. It forwards requests to Node.js `/internal/v1/agent-tools/*` along with the cryptographically signed delegation JWT. Node.js independently verifies the user's active membership in PostgreSQL before honoring any request.

### 2.5 LangGraph Adapter Readiness

The framework includes `LangGraphToolDescriptor` in `app/tools/adapters/langgraph_adapter.py`. This wraps each tool and allows seamless binding to LangGraph agent runtimes in Module 12 without executing premature agent loops in Module 11.
