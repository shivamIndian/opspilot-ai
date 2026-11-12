# OpsPilot AI — Engineering & Coding Standards

This guide outlines the mandatory engineering standards for all code contributed to OpsPilot AI.

---

## 1. Monorepo Organization & Folder Conventions

- **`apps/*`**: Self-contained runnable applications.
- **`packages/*`** (Future Modules): Shared libraries and types.
- **Application Directory Layout**:
  - `config/`: Validated configuration definitions and constants.
  - `controllers/`: HTTP request handling and response serialization.
  - `middleware/`: Express middleware pipelines (auth, error, logging).
  - `routes/`: Routing maps decoupled from request business logic.
  - `services/`: Core domain business logic.
  - `repositories/`: Data access layer interfacing databases (Prisma / Kysely in Module 02).
  - `types/`: Domain TypeScript interfaces and types.
  - `utils/`: Pure helper functions with zero domain state.

---

## 2. Naming Conventions

| Category                  | JavaScript / TypeScript           | Python              | Examples                                |
| :------------------------ | :-------------------------------- | :------------------ | :-------------------------------------- |
| **Files (Modules)**       | `camelCase.ts` or `kebab-case.ts` | `snake_case.py`     | `healthController.ts`, `settings.py`    |
| **React Components**      | `PascalCase.tsx`                  | N/A                 | `StatusCard.tsx`, `RootLayout.tsx`      |
| **Variables & Functions** | `camelCase`                       | `snake_case`        | `calculateScore`, `get_health_status`   |
| **Classes & Types**       | `PascalCase`                      | `PascalCase`        | `ApiResponse`, `SettingsConfig`         |
| **Constants & Enums**     | `UPPER_SNAKE_CASE`                | `UPPER_SNAKE_CASE`  | `MAX_RETRY_COUNT`, `DEFAULT_PORT`       |
| **REST Endpoints**        | `kebab-case` plural               | `kebab-case` plural | `/api/v1/tickets`, `/api/v1/agent-runs` |

---

## 3. Type Safety & TypeScript Guidelines

1. **Strict Mode Mandatory**: `tsconfig.json` enforces `"strict": true`.
2. **No `any` Types**: Explicitly forbid `any`. Use `unknown` with type guards or generic type arguments (`T`) when dealing with dynamic data.
3. **Runtime Schema Validation**: Never cast unvalidated network payloads with `as MyType`. Validate external input through Zod schemas first.
4. **Exported Types**: Explicitly export and document interfaces for all public controllers, services, and API response contracts.

---

## 4. Python Guidelines

1. **Type Annotations**: All function signatures must contain full parameter and return type hints.
2. **Pydantic Schemas**: Request bodies, response bodies, and configuration settings must inherit from Pydantic `BaseModel` or `BaseSettings`.
3. **Async Handlers**: Use non-blocking `async def` route handlers in FastAPI.
4. **Exception Handling**: Handle specific exceptions (`HTTPException`, `ValueError`) rather than blanket `except Exception:` blocks.

---

## 5. API Design & Standardized Response Contracts

All REST endpoints must adhere to unified JSON envelop formats:

### Success Response Contract

```json
{
  "success": true,
  "service": "opspilot-api",
  "data": { ... }
}
```

### Error Response Contract

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_IDENTIFIER",
    "message": "Human-readable explanation of error",
    "details": { ... }
  }
}
```

---

## 6. Error Handling Standards

1. **Fail-Fast Configuration**: If critical environment variables or secrets are missing at startup, the process must terminate immediately with an informative log message.
2. **Centralized Error Handlers**: Do not use ad-hoc `try/catch` in Express controllers that silently swallow exceptions. Propagate unhandled errors to `next(err)` to be processed by `errorHandler`.
3. **No Secret Leaks**: Never return database connection strings, internal IP addresses, or stack traces in HTTP responses to clients in production.

---

## 7. Import Organization & Code Formatting

Imports should be structured in distinct groups separated by an empty line:

```typescript
// 1. External node modules / 3rd-party libraries
import express, { Request, Response } from 'express';
import { z } from 'zod';

// 2. Internal alias imports (@/*)
import { config } from '@/config/env.js';
import { logger } from '@/utils/logger.js';

// 3. Relative local imports
import { getHealth } from './controllers/healthController.js';
import type { HealthResponse } from './types/index.js';
```

Code formatting is enforced globally via Prettier (`.prettierrc`) with 2-space indentation for TypeScript/JS and 4 spaces for Python.
