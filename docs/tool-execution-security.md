# Tool Execution Security & Sandboxing Architecture

## 1. Threat Model & Security Perimeter

AI tool execution presents several threat vectors that OpsPilot AI actively mitigates:

1. **Prompt Injection & Parameter Tampering**: Malicious prompts attempt to override `organization_id` or query cross-tenant resources.
2. **Unauthorized Mutation Operations**: Model attempts to directly modify persistent ticket records or user databases without verification.
3. **Data Exfiltration**: Sensitive credentials (passwords, JWT tokens, session cookies, internal API keys) being returned to LLM context.
4. **Denial of Service (DoS)**: Tools executing runaway queries or returning massive multi-megabyte payloads.

---

## 2. Security Defense Layers

```
Layer 1: Context Isolation
  └── Immutable ToolExecutionContext injected by Core API.
      Parameters like organization_id and user_id are NOT model parameters.

Layer 2: Administrative Status & Policy Checks
  └── ToolPolicyEngine verifies tool.enabled, evaluates required scopes against context.permitted_scopes.

Layer 3: Strict Schema Validation
  └── Pydantic v2 enforces types, bounds, regex patterns, and string lengths before tool receives input.

Layer 4: Sandboxed Asynchronous Execution
  └── asyncio.wait_for enforces tool.timeout_seconds.
  └── Bounded retry loop for transient failures.

Layer 5: Proposal Enforcement for Mutations
  └── Mutation tools are prohibited from database writes.
  └── Emits ToolActionProposal with status='awaiting_approval'.

Layer 6: Recursive Sanitization & Size Constraints
  └── Recursively redacts sensitive keys (password, token, secret, apiKey).
  └── Strips ASCII control characters.
  └── Enforces 512 KB payload size ceiling.

Layer 7: Asynchronous Audit Logging
  └── SHA-256 hash of input parameters, timing, status, and error code persisted to ai.agent_tool_executions.
```

---

## 3. Data Sanitization Implementation

### 3.1 Key Redaction

Any dictionary key matching regex `(password|secret|token|api[_-]?key|credential|authorization)` is replaced with `[REDACTED]`.

### 3.2 Inline Secret Masking

`sanitize_text` uses regular expressions to detect and redact inline credentials:

```python
INLINE_SECRET_PATTERNS = [
    re.compile(r"((?:password|secret|api[_-]?key|token)\s*[:=]\s*)['\"]?([^\s'\"]+)['\"]?", re.IGNORECASE),
    re.compile(r"(bearer\s+)([a-zA-Z0-9\._\-]+)", re.IGNORECASE),
]
```

### 3.3 Payload Size Bounds

Responses exceeding `512 KB` (524,288 bytes) trigger `ToolOutputTooLargeError`, preventing context exhaustion and excessive memory consumption.
