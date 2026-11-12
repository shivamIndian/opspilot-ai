# ADR-009: Agent Memory & User Consent Controls

## Status
Accepted

## Context
Personalizing AI interactions requires retaining user preferences and workflow context across conversations, but unrestricted memory retention risks privacy violations and prompt memory poisoning.

## Decision
We implemented a consent-scoped persistent memory system (`ai.user_memories`). Memory extraction undergoes screening filters, users can inspect all stored memories in their settings, and users possess complete deletion sovereignty ("forget all" control).

## Consequences
- Compliance with GDPR / privacy principles (user consent and right to erasure).
- Context personalization without cross-user memory leakage.
