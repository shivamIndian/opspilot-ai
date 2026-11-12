# ADR-008: Human-in-the-Loop Maker-Checker Approval Gateway

## Status
Accepted

## Context
Allowing autonomous AI agents to directly mutate critical business data (e.g. ticket priority, user permissions, external webhooks) poses severe operational and security risks if an agent hallucinates or encounters adversarial input.

## Decision
We implemented a strict maker-checker approval gateway. Autonomous agents propose actions (`app.agent_action_proposals`) rather than directly mutating databases. High and critical-risk actions require review and approval by an authorized human administrator before execution. Self-approval is strictly forbidden.

## Consequences
- Zero unreviewed high-risk mutations.
- Complete auditability of every agent recommendation and human decision.
- Resumption of interrupted agent workflows via durable outbox queues.
