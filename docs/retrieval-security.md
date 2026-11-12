# OpsPilot AI – Retrieval Security & Tenant Isolation

## 1. Multi-Tenant Isolation Guarantee

OpsPilot AI is an enterprise SaaS platform. Strict multi-tenant isolation is enforced at every layer:

1. **User Request Layer**:
   - The user must provide a valid JWT bearer token.
   - `requireOrganizationContext` middleware extracts `organizationId` from route parameters and verifies the user has an active membership (`owner`, `admin`, `member`, or `viewer`) in `app.organization_memberships`.
   - Foreign users cannot access organization routes.
2. **Internal Service-to-Service Layer**:
   - Internal Python endpoint `POST /internal/v1/retrieval/search` requires `Authorization: Bearer <AI_SERVICE_INTERNAL_TOKEN>`.
   - Token validation is executed in constant time using `secrets.compare_digest`.
   - The Python service executes all vector and full-text searches with `WHERE organization_id = :organization_id`.
3. **Authoritative Document Validation Layer**:
   - The Python microservice returns candidate references.
   - The Node.js API queries `app.documents` using `WHERE organization_id = $1 AND id = ANY($2)`.
   - Any candidate chunk belonging to another organization is dropped.
   - Any candidate from an archived document (`status == 'archived'` or `archived_at != null`) is dropped.
   - Any candidate with a stale processing generation (`processing_generation != doc.processing_generation`) is dropped.

## 2. Parameterized Queries & Injection Resistance

- All vector queries are executed via SQLAlchemy bound parameters or SQLAlchemy Core expressions.
- Full-text queries use `func.websearch_to_tsquery('simple', :query)` which safely tokenizes user input without dynamic string concatenation.
- No user query strings are ever interpolated directly into raw SQL.

## 3. Privacy & Sanitized Telemetry

- Numerical embedding vectors (`float[1536]`) are never output to logs or API responses.
- Private document contents are not logged in standard server log output.
- Only sanitized query lengths, candidate counts, and execution durations in milliseconds are logged for observability.
