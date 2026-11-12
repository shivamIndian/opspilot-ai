# OpsPilot AI – Memory Extraction & Classification Engine

## 1. Candidate Memory Extraction Pipeline

OpsPilot AI includes an asynchronous, LLM-based memory candidate extraction pipeline that distills durable factual patterns from conversation transcripts.

```
Multi-turn Conversation Messages
               |
               v
  [ConversationMemoryExtractor]
               |
               +---> Prompt Template: app/memory/prompts/memory_extraction_v1.txt
               |
               v
         [LLM Invocation] (Temperature=0.1, Structured JSON)
               |
               v
     [Raw Candidate Objects]
               |
               +---> [MemoryClassifier.normalize_type_and_category]
               |
               +---> [MemoryValidator.validate_candidate]
               |     - Title (3..200 chars)
               |     - Content (3..4000 chars)
               |     - Importance (1..10)
               |
               +---> [MemoryScreeningService.screen_text]
               |     - Rejects credentials, secrets, PII, prompt injections
               |
               v
   [Validated Memory Proposals] -> Returned to User for Explicit Confirmation
```

---

## 2. Memory Types & Categories

Each extracted candidate is categorized into one of four distinct memory types:

1. `preference`:
   - User-specific style, tooling, or interface choices (e.g., "Prefers TypeScript for backend services", "Wants concise bullet-point ticket summaries").
   - Importance: Typically 6–9.
2. `contextual_fact`:
   - Durable operational context regarding the user's role or infrastructure (e.g., "User is lead engineer for Kubernetes Cluster Titan").
   - Importance: Typically 7–10.
3. `workflow_summary`:
   - High-level factual recap of multi-turn tasks completed across sessions.
   - Importance: Typically 4–6.
4. `recurring_pattern`:
   - Frequent operational patterns or habituated workflows (e.g., "Always checks Grafana dashboards before deploying tickets").
   - Importance: Typically 5–7.

---

## 3. Strict Prohibitions

The extraction engine explicitly ignores:
- Transient conversational pleasantries ("hello", "thanks").
- One-off factual lookups ("what is the company vacation policy?").
- Passwords, secret keys, tokens, or session IDs.
- User sentiment, emotional commentary, or non-technical personal gossip.
