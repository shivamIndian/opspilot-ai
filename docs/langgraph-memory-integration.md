# OpsPilot AI – LangGraph Memory Integration

## 1. Integration with Stateful Workflows

The LangGraph Workflow Engine (Module 12) maintains transient execution states in `ai.checkpoints`. Module 15 integrates persistent memory into this architecture via `LangGraphMemoryAdapter`:

```
                 Incoming User Request (query, user_id, org_id)
                                    |
                                    v
                     [LangGraphMemoryAdapter]
               (Pre-workflow Retrieval Hook)
                                    |
            +-----------------------+-----------------------+
            |                                               |
  Check Consent: False                            Check Consent: True
            |                                               |
  user_memories: []                               Retrieve Top-K Memories
  user_memory_context: None                       user_memories: [...]
            |                                     user_memory_context: "<user_memory_context>..."
            +-----------------------+-----------------------+
                                    |
                                    v
                      [Initial OpsPilotWorkflowState]
                                    |
                                    v
                       [LangGraph Execution Nodes]
                      - classify_intent
                      - create_plan
                      - execute_next_step
                      - generate_final_response (Uses advisory context)
                                    |
                                    v
                       [WorkflowRunData Outcome]
                                    |
                                    v
               (Post-workflow Candidate Extraction Hook)
                If memory_extraction_enabled:
                  -> Extracts Candidate Proposals
                  -> Attaches to data.memory_proposals
```

---

## 2. Updated State Definitions

`OpsPilotWorkflowState` (in `app/agents/state.py`) includes the following fields:

```python
class OpsPilotWorkflowState(TypedDict, total=False):
    # Long-Term and Episodic Memory State (Module 15)
    user_id: Optional[str]
    user_memories: Optional[List[Dict[str, Any]]]
    user_memory_context: Optional[str]
    episodic_summary: Optional[str]
    memory_proposals: Optional[List[Dict[str, Any]]]
```

And `WorkflowRunData` (in `app/agents/schemas.py`) returns:
```python
memory_proposals: List[Dict[str, Any]] = Field(default_factory=list)
```

---

## 3. Strict Separation from LangGraph Checkpoints

- **LangGraph Checkpoints (`ai.checkpoints`)**:
  - Transient, multi-step node state, step indices, pending tool action proposals.
  - Automatically deleted or superseded as threads progress.
- **Agent Memories (`ai.agent_memories`)**:
  - Durable, persistent, curated preferences and facts.
  - Managed exclusively by the user through explicit CRUD and confirmation.
