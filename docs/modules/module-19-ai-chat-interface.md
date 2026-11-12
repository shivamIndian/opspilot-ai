# Module 19: OpsPilot AI – AI Chat Interface & Conversational Assistant

## 1. Overview & System Mission

Module 19 implements the enterprise **AI Chat Interface** for OpsPilot AI. It provides an intelligent conversational assistant tightly integrated with:
- **Stateful LangGraph Workflows**: Multi-turn dialogue persistence through correlated thread IDs.
- **Enterprise Knowledge Base & Hybrid RAG**: Grounded responses with verifiable document citations, relevance confidence scores, and preview links.
- **Agent Tool Calling Telemetry**: Visual indicators displaying autonomous tool discovery, query parameters, and execution status.
- **Human-in-the-Loop (HITL) Action Proposals**: Visual risk-gated mutation cards allowing administrators to review and approve proposed business operations directly from the conversational flow.
- **Server-Sent Events (SSE) Streaming**: Low-latency, progressive streaming of conversational deltas, citations, and approval alerts.

---

## 2. Architecture & Data Flow

```
                                  +------------------------------------+
                                  |         React 18 Chat UI           |
                                  |   (/organizations/:orgId/chat)     |
                                  +-----------------+------------------+
                                                    |
                                                    | Authenticated HTTP / SSE Stream
                                                    v
                                  +------------------------------------+
                                  |     Node.js Express API Server     |
                                  |   (Conversations Router & Service) |
                                  +--------+------------------+--------+
                                           |                  |
              Durable Thread & Message     |                  | Internal AI Workflow Run
              Persistence (PostgreSQL)     |                  | (LangGraph Engine)
                                           v                  v
                           +-------------------+      +-------------------+
                           | PostgreSQL 16 DB  |      | Python AI Service |
                           |   (Schema: app)   |      |  (Schema: ai)     |
                           |                   |      |                   |
                           | app.conversations |      | ai.agent_workflow |
                           | app.conversation_ |      |     _runs         |
                           |   messages        |      | ai.checkpoints    |
                           +-------------------+      +-------------------+
```

### Core Invariants:
1. **Thread Correlation**: Every chat conversation created generates a persistent UUID `thread_id` that is passed into LangGraph (`workflowService.runWorkflow({ threadId })`). This links LangGraph's stateful memory, checkpointing, and tool resumption to the user's conversation.
2. **Citation Grounding**: Assistant answers extract citations from the workflow's retrieved context (`sources`), storing document IDs, filenames, snippets, and similarity scores.
3. **Action Gating**: Any business action proposal flagged with `requires_approval: true` is displayed with an interactive `ApprovalCard`, deep-linking the operator to the approval workflow without manual intervention.
4. **Tenant Isolation**: All database operations query `WHERE organization_id = $1` with active user authentication checks.

---

## 3. Database Schema

Migration `1700000000008_create-conversations-tables.cjs` establishes:

### `app.conversations`
- `id` (UUID PK)
- `organization_id` (UUID FK -> `app.organizations(id)`)
- `user_id` (UUID FK -> `app.users(id)`)
- `thread_id` (VARCHAR(128) NOT NULL UNIQUE)
- `title` (VARCHAR(255) NOT NULL DEFAULT 'New Conversation')
- `status` (VARCHAR(32) NOT NULL DEFAULT 'active')
- `metadata` (JSONB NOT NULL DEFAULT '{}')
- `created_at` / `updated_at` (TIMESTAMPTZ)

### `app.conversation_messages`
- `id` (UUID PK)
- `conversation_id` (UUID FK -> `app.conversations(id) ON DELETE CASCADE`)
- `organization_id` (UUID FK -> `app.organizations(id)`)
- `user_id` (UUID NULLABLE FK -> `app.users(id)`)
- `role` (VARCHAR(32) NOT NULL CHECK ('user', 'assistant', 'system'))
- `content` (TEXT NOT NULL)
- `citations` (JSONB NOT NULL DEFAULT '[]')
- `tool_calls` (JSONB NOT NULL DEFAULT '[]')
- `action_proposals` (JSONB NOT NULL DEFAULT '[]')
- `telemetry` (JSONB NOT NULL DEFAULT '{}')
- `status` (VARCHAR(32) NOT NULL DEFAULT 'completed')
- `created_at` (TIMESTAMPTZ)

---

## 4. API Endpoints

Mounted under `/api/v1/organizations/:organizationId/conversations`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | List all active conversations for the authenticated user and organization. |
| `POST` | `/` | Create a new conversation (with optional initial message). |
| `GET` | `/:conversationId` | Get single conversation details. |
| `PATCH` | `/:conversationId` | Rename conversation title. |
| `DELETE` | `/:conversationId` | Archive/soft-delete a conversation. |
| `GET` | `/:conversationId/messages` | Retrieve conversation message history with citations and tool calls. |
| `POST` | `/:conversationId/messages` | Send message and execute LangGraph workflow synchronously. |
| `GET` | `/:conversationId/stream` | Stream assistant response via Server-Sent Events (SSE). |

---

## 5. Frontend Architecture

Located in `apps/web/src/features/chat/`:

- **Components**:
  - `ChatSidebar`: List of active conversations, search filter, creation button, relative timestamps, and deletion triggers.
  - `ChatHeader`: Conversation title with inline editing, active thread indicator, and mobile toggle.
  - `MessageBubble`: Chat bubble rendering Markdown formatting, inline code blocks, timestamps, citations drawer, and approval action cards.
  - `MessageComposer`: Auto-expanding textarea, character counter, keyboard shortcuts (`Enter` to send, `Shift+Enter` for newline), and submission state.
  - `CitationCard`: Document filename, match confidence score badge, snippet preview, and link to document viewer.
  - `ApprovalCard`: Gated action notification with risk badges (critical, high, medium), tool arguments, justification, and deep link to `/approvals`.
  - `AgentActivityIndicator`: Live pulse indicator when LangGraph is executing retrieval, tool invocation, or LLM reasoning.
  - `ChatEmptyState`: Welcome banner with curated prompt suggestion cards covering knowledge runbooks, ticket triage, and approval policies.

- **Routing & State**:
  - Registered route: `/organizations/:organizationId/chat`
  - Integrated into main navigation with `MessageSquare` icon.
  - Reactive TanStack Query state with optimistic message updates.

---

## 6. Testing & Quality Gates

- **API Tests** (`apps/api/tests/conversations.test.ts`): 13/13 passing.
  - Tenant isolation enforcement.
  - Auto-titling from initial prompt.
  - Dynamic workflow resumption and thread ID correlation.
  - RAG citations and action proposal extraction into message records.
- **Frontend Tests** (`apps/web/tests/chat.test.tsx`): 4/4 passing.
  - Interface rendering with sidebar and message history.
  - Conversation switching and empty state suggestions.
  - Message submission and response rendering.
  - Conversation creation.
- **Build Verification**: Web bundle built with zero TypeScript or packaging errors (`tsc -b && vite build`).
