"""Deterministic Information Retrieval (IR) and LLM Evaluation Metrics Engine."""

import math
from typing import List, Set, Dict, Any, Optional
from pydantic import BaseModel, Field


class JudgeEvaluationResult(BaseModel):
    """Structured Pydantic schema for model-based evaluation scores."""

    relevance_score: float = Field(..., ge=0.0, le=5.0, description="Relevance of answer to user inquiry (0-5)")
    faithfulness_score: float = Field(..., ge=0.0, le=5.0, description="Faithfulness to retrieved source context (0-5)")
    completeness_score: float = Field(..., ge=0.0, le=5.0, description="Completeness of coverage (0-5)")
    rubric_version: str = Field(default="rubric_v1.0")
    safe_explanation: str = Field(..., max_length=500, description="High-level evaluation rationale without private prompts")


class EvaluationMetrics:
    """Computes deterministic and grounded evaluation metrics."""

    @staticmethod
    def precision_at_k(retrieved_ids: List[str], relevant_ids: Set[str], k: int) -> float:
        """Measures proportion of top-K retrieved results that are relevant."""
        if k <= 0 or not retrieved_ids:
            return 0.0
        retrieved_k = retrieved_ids[:k]
        hits = sum(1 for item_id in retrieved_k if item_id in relevant_ids)
        return round(hits / k, 4)

    @staticmethod
    def recall_at_k(retrieved_ids: List[str], relevant_ids: Set[str], k: int) -> float:
        """Measures proportion of expected relevant items appearing in top-K."""
        if not relevant_ids:
            return 0.0
        retrieved_k = retrieved_ids[:k]
        hits = sum(1 for item_id in retrieved_k if item_id in relevant_ids)
        return round(hits / len(relevant_ids), 4)

    @staticmethod
    def reciprocal_rank(retrieved_ids: List[str], relevant_ids: Set[str]) -> float:
        """Measures reciprocal rank of the first relevant result (1 / rank)."""
        for idx, item_id in enumerate(retrieved_ids, start=1):
            if item_id in relevant_ids:
                return round(1.0 / idx, 4)
        return 0.0

    @staticmethod
    def ndcg_at_k(retrieved_ids: List[str], relevant_ids: Set[str], k: int) -> float:
        """Normalized Discounted Cumulative Gain at rank K."""
        if k <= 0 or not relevant_ids or not retrieved_ids:
            return 0.0

        retrieved_k = retrieved_ids[:k]
        dcg = 0.0
        for idx, item_id in enumerate(retrieved_k, start=1):
            rel = 1.0 if item_id in relevant_ids else 0.0
            dcg += rel / math.log2(idx + 1)

        idcg = 0.0
        num_ideal = min(len(relevant_ids), k)
        for idx in range(1, num_ideal + 1):
            idcg += 1.0 / math.log2(idx + 1)

        if idcg == 0.0:
            return 0.0
        return round(dcg / idcg, 4)

    @staticmethod
    def hit_rate(retrieved_ids: List[str], relevant_ids: Set[str], k: int = 5) -> float:
        """Whether at least one relevant document was retrieved in top K."""
        if not relevant_ids:
            return 0.0
        retrieved_k = retrieved_ids[:k]
        return 1.0 if any(item_id in relevant_ids for item_id in retrieved_k) else 0.0

    @staticmethod
    def evaluate_citation_validity(
        cited_ids: List[str],
        valid_retrieved_ids: Set[str],
    ) -> Dict[str, Any]:
        """Validates that cited chunks/documents were actually present in retrieved context."""
        if not cited_ids:
            return {
                "total_citations": 0,
                "valid_citations": 0,
                "hallucinated_citations": 0,
                "validity_rate": 100.0,
            }

        valid_count = sum(1 for cid in cited_ids if cid in valid_retrieved_ids)
        hallucinated_count = len(cited_ids) - valid_count
        validity_rate = round((valid_count / len(cited_ids)) * 100, 1)

        return {
            "total_citations": len(cited_ids),
            "valid_citations": valid_count,
            "hallucinated_citations": hallucinated_count,
            "validity_rate": validity_rate,
        }

    @staticmethod
    def evaluate_tool_selection(actual_tool: Optional[str], expected_tool: Optional[str]) -> bool:
        """Determines whether agent selected the correct tool based on test ground truth."""
        if expected_tool is None and actual_tool is None:
            return True
        if expected_tool is None or actual_tool is None:
            return False
        return actual_tool.strip().lower() == expected_tool.strip().lower()

    @staticmethod
    def evaluate_approval_compliance(
        requires_approval_actual: bool,
        requires_approval_expected: bool,
    ) -> bool:
        """Validates that high-risk mutations triggered human approval policy requirement."""
        return requires_approval_actual == requires_approval_expected
