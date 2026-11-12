# Delegated Authorization for AI Tool Execution

## 1. Delegated Authorization Pattern

In OpsPilot AI, the Python AI Service does **not** possess omnipotent access to business databases. Instead, it operates using **cryptographically signed delegated authorization**:

1. **Originating Request**: A user interacts with OpsPilot via the React frontend or API gateway.
2. **Assertion Generation**: Node.js Core API creates a short-lived JSON Web Token (JWT) assertion specifying the authenticated user (`sub`), target organization (`orgId`), request identifier (`requestId`), and authorized permission scopes (`scopes`).
3. **Execution Request**: Core API invokes Python `/internal/v1/tools/execute`, embedding the assertion into `delegated_authorization_token`.
4. **Tool Adapter Invocation**: When the tool needs business data, Python calls Node.js `/internal/v1/agent-tools/*` forwarding the assertion in the `x-delegation-token` header alongside `Authorization: Bearer <internal_token>`.
5. **Independent Authority Verification**: Node.js verifies the JWT signature and queries PostgreSQL `app.organization_members` to ensure the user is an active member with appropriate role permissions in that specific organization.

```
+------------+               +------------------+               +--------------------+
| Node.js    |  (1) Generate | Python           |  (3) Tool     | Node.js Internal   |
| Core API   | ------------> | AI Service       | ------------> | Business Gateway   |
| Orchestrator|  Delegation   | (Tool Execution) |  x-delegation | (/internal/v1/     |
+------------+   Assertion   +------------------+     token     |  agent-tools/*)    |
                                                                +---------+----------+
                                                                          | (4) Independent
                                                                          v     Tenant Check
                                                                +--------------------+
                                                                | PostgreSQL (app)   |
                                                                | Verify Membership  |
                                                                +--------------------+
```

---

## 2. JWT Assertion Claims Structure

```json
{
  "sub": "11111111-1111-4111-8111-111111111111",
  "orgId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "requestId": "req-98765432-abcd",
  "scopes": [
    "tools:knowledge:read",
    "tools:tickets:read",
    "tools:tickets:write",
    "tools:users:read",
    "tools:history:read"
  ],
  "iss": "opspilot:core-api",
  "aud": "opspilot:agent-tools",
  "jti": "d0e1c2b3-a4f5-6789-0123-456789abcdef",
  "iat": 1730700000,
  "exp": 1730700900
}
```

### Claims Specification

- `sub`: Authenticated User UUID.
- `orgId`: Target Organization UUID. Cross-tenant execution is strictly prohibited.
- `requestId`: Idempotency tracking identifier.
- `scopes`: Explicit whitelist of permissions granted to the agent for this specific turn.
- `iss`: Authority issuer identifier (`opspilot:core-api`).
- `aud`: Explicit audience claim (`opspilot:agent-tools`).
- `exp`: Short expiration window (default: 15 minutes).
