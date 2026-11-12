# OpsPilot AI — End User & Administrator Guide

Welcome to **OpsPilot AI**, the enterprise Agentic AI platform designed to streamline IT support operations, automate troubleshooting, and unlock organizational knowledge securely.

---

## 1. Getting Started

### 1.1 Account Registration & Login
1. Navigate to the OpsPilot AI login portal (`https://app.opspilot.com` or local URL).
2. For new accounts, click **Sign Up** and enter your full name, work email address, and an OWASP-compliant password (minimum 8 characters with uppercase, lowercase, numbers, and special symbols).
3. Upon login, your session is authenticated via secure HTTP-only cookies and short-lived tokens.

### 1.2 Selecting & Managing Organizations
1. OpsPilot AI is multi-tenant. Use the **Organization Switcher** in the top navigation bar to select your active workspace.
2. If you are an Organization Owner or Admin, you can invite team members via **Settings &rarr; Members** and assign roles (`viewer`, `member`, `agent`, `admin`).

---

## 2. Support Ticket Management

1. **Viewing Tickets**: Click **Tickets** in the sidebar to view the operational Kanban/list view. Filter by status (`open`, `in_progress`, `waiting`, `resolved`), priority, or assignee.
2. **Creating a Ticket**: Click **Create Ticket**, provide a clear subject, description, priority, and relevant category. A sequential ticket number (e.g. `OP-1042`) is generated automatically.
3. **Collaborating on Incidents**: Open any ticket to add public customer responses or internal diagnostic notes. View the complete historical audit log of state transitions.

---

## 3. Knowledge Base & Document Management

1. **Uploading Documentation**: Navigate to **Knowledge Base &rarr; Upload**. Upload system architecture guides, runbooks, or standard operating procedures (PDF, DOCX, or TXT up to 25MB).
2. **Automated Vector Ingestion**: The system automatically extracts text, performs chunking, generates vector embeddings, and builds full-text search indexes.
3. **Searching Knowledge**: Use the unified search bar to perform semantic and keyword hybrid searches across all active organization documents.

---

## 4. AI Chat Assistant & Grounded Answers

1. **Interactive Inquiries**: Navigate to **AI Chat** to ask questions about internal processes, system incidents, or operational runbooks.
2. **Verifiable Citations**: Every claim in the generated answer includes an interactive citation pill (e.g. `[1]`, `[2]`). Clicking a citation opens a drawer displaying the source document excerpt, title, and page number.
3. **Hallucination Defense**: If documents do not contain sufficient evidence to answer your inquiry, the assistant will explicitly state that evidence is insufficient rather than guessing.

---

## 5. Human-in-the-Loop Agent Approvals

When an AI agent investigates an issue and recommends a mutation (such as escalating a ticket's priority, reassigning an incident, or modifying configuration):
1. **Action Proposals**: The agent generates a formal **Action Proposal** with a detailed justification and risk rating (`low`, `medium`, `high`, `critical`).
2. **Reviewing Proposals**: Go to **Approvals** to inspect the proposed action payload, target entity, and agent reasoning.
3. **Maker-Checker Segregation**: If an action is high or critical risk, the user who initiated the workflow CANNOT approve their own action. Another authorized administrator must review and click **Approve** or **Reject**.
4. **Execution**: Upon approval, the change is executed safely through the authenticated business gateway and recorded in the audit trail.

---

## 6. Privacy & Agent Memory Controls

1. **Viewing Memories**: Navigate to **Settings &rarr; Agent Memory** to see facts, preferences, or workflow contexts retained by the AI.
2. **Deleting Context**: You can delete individual memory items or click **Forget All** to erase all stored personal context immediately.
