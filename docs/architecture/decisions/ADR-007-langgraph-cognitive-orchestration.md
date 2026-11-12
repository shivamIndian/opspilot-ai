# ADR-007: LangGraph for Stateful Cognitive Agent Workflows

## Status
Accepted

## Context
Autonomous agents require cyclic execution graphs, multi-step planning, dynamic replanning based on tool observations, and interruptible state checkpoints for human-in-the-loop approvals.

## Decision
We implemented cognitive workflows using LangGraph in `apps/ai-service`. Agent workflows are structured as directed cyclic state graphs with durable PostgreSQL checkpointing (`ai.langgraph_checkpoints`).

## Consequences
- Stateful, fault-tolerant agent execution across server restarts.
- First-class support for workflow interrupts (`interrupt()`) when an action proposal requires human authorization.
- Resumption from exact checkpoint states once human decisions are recorded.
