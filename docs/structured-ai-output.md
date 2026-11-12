# Structured AI Output & Pydantic Validation

## Overview

OpsPilot AI strictly prohibits free-form text parsing and regex-based response extraction for mission-critical operations. All LLM generations are constrained to strict, validated JSON schemas using Pydantic v2 and the OpenAI Parse API.

---

## 1. Structured Output Schema: `StructuredAnswer`

The target data model is defined in `apps/ai-service/app/llm/schemas.py`:

```python
class StructuredAnswer(BaseModel):
    """Guaranteed structured output schema returned by the LLM."""

    answer: str = Field(
        ...,
        description="Factual, grounded answer to the user query based strictly on supplied sources.",
    )
    cited_source_ids: List[str] = Field(
        default_factory=list,
        description="List of source IDs (e.g. ['S1', 'S2']) directly supporting the answer.",
    )
    insufficient_evidence: bool = Field(
        default=False,
        description="True if the supplied sources do not contain sufficient evidence to answer.",
    )
    limitations: List[str] = Field(
        default_factory=list,
        description="Known omissions, contradictory statements, or ambiguities in sources.",
    )
    follow_up_questions: List[str] = Field(
        default_factory=list,
        description="Suggested follow-up questions to help the user clarify or explore further.",
    )
```

---

## 2. Model Constraint Mechanisms

### Primary: OpenAI Structured Output (`parse`)

Modern OpenAI models (e.g., `gpt-4o`, `gpt-4o-mini`) natively enforce JSON schemas via context-free grammar constraints:

```python
response = await self._client.beta.chat.completions.parse(
    model=self.model,
    messages=messages,
    response_format=response_schema,
    max_tokens=tokens,
    temperature=temp,
)
parsed_object = response.choices[0].message.parsed
```

### Secondary Fallback: JSON Validation

If the provider returns raw text containing JSON rather than a pre-parsed object, the service passes the content to Pydantic:

```python
try:
    validated = response_schema.model_validate_json(content)
except ValidationError as val_err:
    raise LLMStructuredOutputFailedError(
        message=f"Model output failed schema validation: {str(val_err)}",
        details={"raw_content": content[:500]},
    )
```

---

## 3. Schema Failure Modes & Handling

| Failure Scenario            | Detection Mechanism                                          | System Action                                                          |
| --------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **Truncated JSON**          | `finish_reason == "length"`                                  | Raises `LLMOutputTruncatedError`; does not expose broken JSON to user. |
| **Safety Filter Refusal**   | `finish_reason == "content_filter"` or `refusal is not None` | Raises `LLMContentFilteredError` with sanitized user message.          |
| **Invalid Schema Types**    | Pydantic `ValidationError`                                   | Raises `LLMStructuredOutputFailedError`; logged to Sentry / audit log. |
| **Missing Required Fields** | Pydantic validation                                          | Non-nullable missing fields trigger validation rejection.              |
