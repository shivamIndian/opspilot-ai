# OpsPilot AI — Developer Guide

## 1. Monorepo Architecture & Coding Standards

OpsPilot AI is organized as an npm workspaces monorepo with a dedicated Python microservice:

```
opspilot-ai/
├── apps/
│   ├── web/          # React 18, TypeScript, Tailwind, Vite SPA
│   ├── api/          # Node.js 22, Express, TypeScript REST Gateway
│   └── ai-service/   # Python 3.11, FastAPI, LangGraph Cognitive Engine
├── infrastructure/   # Terraform modules & Docker Compose blueprints
├── docs/             # Technical architecture and operational guides
└── package.json      # Monorepo workspaces definition and root scripts
```

### Key Development Rules:
1. **Schema Ownership**:
   - `apps/api` owns and modifies ONLY `src/database/migrations` targeting `schema: app`.
   - `apps/ai-service` owns and modifies ONLY `alembic/versions` targeting `schema: ai`.
2. **Type Safety**:
   - Always declare explicit TypeScript types or interfaces.
   - Use Zod schemas in `apps/api/src/modules/*/validators/` for runtime payload validation.
   - Use Pydantic v2 schemas in `apps/ai-service/app/*/schemas.py` for Python validation.
3. **Internal Gateway Security**:
   - Python AI calls into Node.js tool endpoints MUST pass `X-Internal-Service-Token` and an authenticated delegation token.
4. **Testing Invariant**:
   - Every new feature, endpoint, or repository query must include unit or integration tests.
   - Run `npm test` before submitting pull requests.

---

## 2. Adding a New Business Tool

To register a new autonomous agent tool:
1. Define the tool handler in `apps/api/src/modules/agents/tools/`.
2. Add input schema validation using Zod.
3. Register the tool in `agent-tool.registry.ts` specifying name, description, risk level (`low`, `medium`, `high`, `critical`), and required scopes.
4. If risk level is `high` or `critical`, ensure the tool produces an action proposal in `app.agent_action_proposals` rather than directly mutating the database.
5. Add unit and contract tests in `apps/api/tests/`.

---

## 3. Pull Request & Code Review Process

1. Create a branch from `main` using standard prefixes: `feat/*`, `fix/*`, `chore/*`, `docs/*`.
2. Verify code quality locally:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```
3. Open a Pull Request against `main`. All CI checks in `ci.yml` must pass before merge.
