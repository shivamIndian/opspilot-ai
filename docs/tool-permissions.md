# Tool Permission Model & Scopes

## 1. Permission Scopes Specification

To enforce least-privilege access, the OpsPilot AI tool framework defines discrete scopes:

| Permission Scope       | Allowed Operations                    | Associated Tools                                 | Default Roles                |
| :--------------------- | :------------------------------------ | :----------------------------------------------- | :--------------------------- |
| `tools:knowledge:read` | RAG search across organization docs   | `search_knowledge_base`                          | Owner, Admin, Member, Viewer |
| `tools:tickets:read`   | Inspect details of accessible tickets | `get_ticket_details`                             | Owner, Admin, Member, Viewer |
| `tools:tickets:write`  | Propose ticket creation and updates   | `create_support_ticket`, `update_support_ticket` | Owner, Admin, Member         |
| `tools:users:read`     | Discover organization members         | `search_user_information`                        | Owner, Admin, Member         |
| `tools:history:read`   | Read ticket activity & past context   | `summarize_support_history`                      | Owner, Admin, Member         |

---

## 2. Enforcement Points

### 2.1 Python ToolPolicyEngine (Pre-Execution)

Before a tool invokes external network clients, `ToolPolicyEngine.evaluate(tool, context)` verifies that every scope listed in `tool.required_permissions` is present in `context.permitted_scopes`.
If any required scope is missing, the engine immediately aborts execution with `ToolPermissionDeniedError` (`HTTP 403` / `TOOL_PERMISSION_DENIED`).

### 2.2 Node.js Business Gateway Middleware (`requireToolScope`)

When the internal gateway at `/internal/v1/agent-tools/*` receives a request, the `requireToolScope` middleware checks the decoded delegation token claims. If the token does not contain the required scope, Node.js rejects the call with `403 Forbidden`:

```json
{
  "success": false,
  "error": {
    "code": "TOOL_PERMISSION_DENIED",
    "message": "Insufficient permissions: missing scope 'tools:tickets:write'",
    "details": {
      "requiredScope": "tools:tickets:write",
      "grantedScopes": ["tools:knowledge:read"]
    }
  }
}
```

### 2.3 PostgreSQL Tenant Member Visibility

Even if a token contains `tools:tickets:read`, role-based visibility inside Node.js ensures that regular members can only read tickets they opened or were assigned to, unless they hold the `admin` or `owner` role.
