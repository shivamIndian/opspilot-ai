# OpsPilot AI — Authentication & Authorization Architecture

## 1. Architectural Overview & Design Philosophy

OpsPilot AI enforces a zero-trust, defense-in-depth authentication and session management architecture designed for enterprise-grade Agentic AI operations.

### Key Architectural Tenets

1. **Node.js Express as Sole Identity Authority**: The Node.js Express API (`@opspilot/api`) maintains exclusive ownership of identity, credential verification, platform authorization, and the PostgreSQL `app` schema. The Python FastAPI AI microservice never authenticates end-users directly.
2. **Ephemeral In-Memory Access Tokens**: 15-minute JWT access tokens are maintained strictly in application memory (Zustand store / React context). They are **never** persisted to `localStorage`, `sessionStorage`, or IndexedDB to prevent XSS-based credential exfiltration.
3. **Cryptographically Rotated HttpOnly Refresh Tokens**: Long-lived refresh sessions (7 days) use random 256-bit entropy tokens stored exclusively in secure `HttpOnly`, `SameSite=Strict` cookies scoped to `/api/v1/auth`.
4. **Token Family Tracking & Active Reuse Detection**: Every refresh operation rotates the token inside an atomic PostgreSQL transaction. Replay of spent tokens triggers immediate family-wide revocation, neutralizing token interception and replay attacks.
5. **Double-Submit CSRF Header Validation**: State-changing cookie-authenticated endpoints (`/refresh`, `/logout`, `/logout-all`) mandate the presence of a matching `X-CSRF-Token` HTTP header against a client-readable CSRF cookie.
6. **State-of-the-Art Password Hashing**: Passwords are encrypted using **Argon2id** (memory cost $19\text{ MiB}$, time cost $2$ iterations, $1$ thread parallelism) to withstand GPU and ASIC offline dictionary attacks.

---

## 2. High-Level Architecture

```mermaid
flowchart TD
    subgraph Client Application Tier [Browser Client — React Vite SPA]
        Zustand["Zustand In-Memory Store<br/>(Access Token, CSRF, User Profile)"]
        AxiosInterceptor["Axios Interceptor<br/>(401 Silent Refresh Queue)"]
        CookieJar["Secure Cookie Storage<br/>(HttpOnly Refresh Token, CSRF Cookie)"]
    end

    subgraph API Gateway Tier [Node.js Express API — @opspilot/api]
        RateLimiter["Rate Limiting Middleware<br/>(Redis Sliding Window)"]
        CSRFGuard["CSRF Protection Middleware<br/>(Header vs Cookie Match)"]
        AuthMiddleware["JWT Authentication Middleware<br/>(Verify Bearer Signature)"]
        RoleGuard["RBAC Authorization Guard<br/>(Platform Roles)"]
        AuthService["Auth & Session Services<br/>(Argon2id, Crypto, Rotation Engine)"]
    end

    subgraph Data Tier [Storage & Cache Infrastructure]
        Redis["Redis Cache<br/>(Rate Limits & Temporary Sessions)"]
        PostgresApp["PostgreSQL 16 (app schema)<br/>- app.users<br/>- app.user_sessions<br/>- app.password_reset_tokens<br/>- app.email_verification_tokens<br/>- app.auth_audit_logs"]
    end

    Client -->|Public Routes: /register, /login| RateLimiter
    Client -->|Authenticated API Request: Bearer JWT| AuthMiddleware
    Client -->|Session Refresh: HttpOnly Cookie + X-CSRF-Token| CSRFGuard

    RateLimiter --> Redis
    CSRFGuard --> AuthService
    AuthMiddleware --> RoleGuard --> AuthService
    AuthService --> PostgresApp
```

---

## 3. Cryptographic Token Lifecycle & Flows

### 3.1 User Registration Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant API as Express API (/auth/register)
    participant Argon as Argon2id Engine
    participant DB as PostgreSQL (app schema)
    participant Email as Email Service (SMTP / Dev)

    User->>API: POST /register { name, email, password }
    API->>API: Validate input schema (OWASP password rules)
    API->>DB: Check if email exists in app.users
    alt Email already registered
        API-->>User: 409 Conflict (EMAIL_ALREADY_EXISTS)
    else Email available
        API->>Argon: Hash password with Argon2id
        Argon-->>API: Safe password hash ($argon2id$...)
        API->>DB: INSERT INTO app.users (role='user', status='active', is_email_verified=false)
        API->>DB: INSERT INTO app.email_verification_tokens (SHA-256 token hash)
        API->>Email: Dispatch verification email with secure token link
        API->>DB: INSERT INTO app.auth_audit_logs (USER_REGISTERED)
        API-->>User: 201 Created { success: true, user: SafeUser }
    end
```

### 3.2 User Login Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant API as Express API (/auth/login)
    participant Argon as Argon2id Engine
    participant DB as PostgreSQL (app schema)

    User->>API: POST /login { email, password }
    API->>API: Validate format
    API->>DB: SELECT * FROM app.users WHERE email = $1
    alt User not found
        API->>Argon: Dummy verification (constant-time mitigation)
        API-->>User: 401 Unauthorized (INVALID_CREDENTIALS)
    else Account Suspended
        API->>DB: Log LOGIN_BLOCKED_SUSPENDED
        API-->>User: 403 Forbidden (ACCOUNT_SUSPENDED)
    else User Exists & Active
        API->>Argon: Verify password against password_hash
        alt Password Mismatch
            API->>DB: Increment failed_login_attempts & Log LOGIN_FAILED
            API-->>User: 401 Unauthorized (INVALID_CREDENTIALS)
        else Password Valid
            API->>DB: Reset failed_login_attempts & update last_login_at
            API->>API: Generate 15-min Access Token (JWT)
            API->>API: Generate 256-bit cryptographically random Refresh Token
            API->>DB: INSERT INTO app.user_sessions (token_family_id, token_hash)
            API->>API: Generate random CSRF token
            API->>DB: Log LOGIN_SUCCESS
            API-->>User: 200 OK<br/>Set-Cookie: opspilot_refresh_token (HttpOnly, SameSite=Strict)<br/>Set-Cookie: opspilot_csrf_token (SameSite=Strict)<br/>Body: { accessToken, csrfToken, user }
        end
    end
```

### 3.3 Silent Token Refresh & Atomic Rotation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client App (Axios Interceptor)
    participant API as Express API (/auth/refresh)
    participant DB as PostgreSQL (app schema)

    Note over Client,API: Triggered when Access Token expires or on page load
    Client->>API: POST /refresh<br/>Cookie: opspilot_refresh_token<br/>Header: X-CSRF-Token
    API->>API: Validate CSRF Header matches opspilot_csrf_token Cookie
    alt CSRF Mismatch or Missing
        API-->>Client: 403 Forbidden (CSRF_TOKEN_INVALID)
    else CSRF Valid
        API->>API: Hash provided raw refresh token (SHA-256)
        API->>DB: SELECT * FROM app.user_sessions WHERE token_hash = $1
        alt Token not found
            API-->>Client: 401 Unauthorized (INVALID_SESSION)
        else Token already revoked (TOKEN REUSE DETECTED!)
            API->>DB: UPDATE app.user_sessions SET revoked_at=NOW() WHERE token_family_id = $family
            API->>DB: Log REFRESH_TOKEN_REUSE_DETECTED
            API-->>Client: 401 Unauthorized (TOKEN_REUSE_DETECTED)<br/>Clear Cookies
        else Token expired
            API->>DB: Revoke session
            API-->>Client: 401 Unauthorized (REFRESH_TOKEN_EXPIRED)
        else Token valid & active
            API->>DB: BEGIN TRANSACTION (FOR UPDATE lock on old session)
            API->>DB: INSERT new session in same token_family_id
            API->>DB: UPDATE old session SET revoked_at=NOW(), replaced_by_session_id=new_id
            API->>DB: COMMIT TRANSACTION
            API->>API: Generate new 15-min Access Token & fresh CSRF Token
            API->>DB: Log REFRESH_TOKEN_ROTATED
            API-->>Client: 200 OK<br/>Set-Cookie: opspilot_refresh_token (new token)<br/>Set-Cookie: opspilot_csrf_token (new CSRF)<br/>Body: { accessToken, csrfToken }
        end
    end
```

---

## 4. Database Relational Model

All authentication tables reside within the `app` schema:

```mermaid
erDiagram
    users ||--o{ user_sessions : "has sessions"
    users ||--o{ password_reset_tokens : "requests"
    users ||--o{ email_verification_tokens : "receives"
    users ||--o{ auth_audit_logs : "generates events"

    users {
        uuid id PK
        varchar email UK
        varchar name
        text password_hash
        varchar platform_role
        varchar status
        boolean is_email_verified
        integer failed_login_attempts
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
    }

    user_sessions {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        uuid token_family_id
        varchar parent_token_hash
        uuid replaced_by_session_id
        text user_agent
        varchar ip_address
        timestamptz revoked_at
        timestamptz expires_at
        timestamptz last_used_at
        timestamptz created_at
    }

    password_reset_tokens {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz used_at
        timestamptz created_at
    }

    email_verification_tokens {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz used_at
        timestamptz created_at
    }

    auth_audit_logs {
        uuid id PK
        uuid user_id FK
        varchar event_type
        varchar ip_address
        text user_agent
        jsonb metadata
        timestamptz created_at
    }
```

---

## 5. Platform Roles & RBAC Foundations

OpsPilot AI establishes a strict two-tier platform role architecture in Module 03:

| Role Name            | Intended Audience            | Permissions & Privileges                                                                       | Escalation Protection                                                |
| :------------------- | :--------------------------- | :--------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| **`user`**           | Standard platform operators  | Access own profile, tickets, workspaces, execution history. Cannot access platform admin APIs. | Default assigned to all public registrations.                        |
| **`platform_admin`** | System infrastructure owners | Access platform administration, user management, audit logs, cluster metrics.                  | Cannot be granted via registration API; requires CLI bootstrap tool. |

### Role Authorization Middleware

```typescript
// Enforce minimum platform role
export const requirePlatformRole = (...allowedRoles: PlatformRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
      return;
    }
    next();
  };
};
```

---

## 6. Audit Logging & Non-Repudiation

Every security-sensitive event is recorded synchronously in `app.auth_audit_logs`:

- `USER_REGISTERED`
- `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGIN_BLOCKED_SUSPENDED`
- `REFRESH_TOKEN_ROTATED`, `REFRESH_TOKEN_REUSE_DETECTED`
- `SESSION_REVOKED`, `ALL_SESSIONS_REVOKED`
- `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_SUCCESS`
- `EMAIL_VERIFICATION_SENT`, `EMAIL_VERIFIED`

Audit logs preserve the client IP address, User-Agent header, subject UUID, and structured metadata without ever recording raw tokens or sensitive passwords.
