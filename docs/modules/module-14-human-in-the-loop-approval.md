# Module 14: Human-in-the-Loop Approval & Workflow Resumption

## 1. Overview
Module 14 built the enterprise maker-checker approval gateway, workflow interrupt checkpoints, and durable outbox resumption.

## 2. Scope & Implementation
- **Action Proposal Lifecycle**: Proposals stored in `app.agent_action_proposals` with status transitions (`awaiting_approval`, `approved`, `rejected`, `executed`, `cancelled`, `expired`).
- **Maker-Checker Segregation**: Self-approval is strictly forbidden on high/critical risk proposals (`MakerCheckerViolationError` HTTP 403).
- **LangGraph Checkpoint Interruption**: Cognitive workflows pause deterministically via `interrupt()` awaiting human decisions.
- **Durable Outbox Pattern**: Upon approval, events are written to `app.agent_workflow_outbox` and processed asynchronously by the outbox worker.

## 3. Status
- **Status**: Complete (100% verified, 24 tests passing across Node and Python).
