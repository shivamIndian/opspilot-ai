"""Evaluation harness for RAG retrieval benchmarking.

Computes actual Information Retrieval (IR) metrics:
- Precision@K
- Recall@K
- Mean Reciprocal Rank (MRR)
- Normalized Discounted Cumulative Gain (nDCG@K)
"""

import math
import uuid
from typing import List, Dict, Set
import pytest

from app.retrieval.services.semantic_search_service import SemanticSearchItem
from app.retrieval.services.keyword_search_service import KeywordSearchItem
from app.retrieval.services.rrf_fusion_service import RrfFusionService


class BenchmarkEvaluator:
    """Calculates standard IR metrics for ranked retrieval lists."""

    @staticmethod
    def precision_at_k(retrieved_ids: List[uuid.UUID], relevant_ids: Set[uuid.UUID], k: int) -> float:
        if k <= 0:
            return 0.0
        retrieved_k = retrieved_ids[:k]
        hits = sum(1 for cid in retrieved_k if cid in relevant_ids)
        return hits / k

    @staticmethod
    def recall_at_k(retrieved_ids: List[uuid.UUID], relevant_ids: Set[uuid.UUID], k: int) -> float:
        if not relevant_ids:
            return 0.0
        retrieved_k = retrieved_ids[:k]
        hits = sum(1 for cid in retrieved_k if cid in relevant_ids)
        return hits / len(relevant_ids)

    @staticmethod
    def reciprocal_rank(retrieved_ids: List[uuid.UUID], relevant_ids: Set[uuid.UUID]) -> float:
        for idx, cid in enumerate(retrieved_ids, start=1):
            if cid in relevant_ids:
                return 1.0 / idx
        return 0.0

    @staticmethod
    def ndcg_at_k(retrieved_ids: List[uuid.UUID], relevant_ids: Set[uuid.UUID], k: int) -> float:
        if k <= 0 or not relevant_ids:
            return 0.0

        retrieved_k = retrieved_ids[:k]
        dcg = 0.0
        for idx, cid in enumerate(retrieved_k, start=1):
            rel = 1.0 if cid in relevant_ids else 0.0
            dcg += rel / math.log2(idx + 1)

        # Ideal DCG (all relevant items ranked at the top)
        idcg = 0.0
        num_ideal = min(len(relevant_ids), k)
        for idx in range(1, num_ideal + 1):
            idcg += 1.0 / math.log2(idx + 1)

        return (dcg / idcg) if idcg > 0 else 0.0


def test_retrieval_evaluation_benchmark():
    """Runs retrieval evaluation on a benchmark dataset and validates IR metrics."""
    org_id = uuid.uuid4()
    run_id = uuid.uuid4()

    # 5 Synthetic documents
    doc_auth = uuid.uuid4()
    doc_vpn = uuid.uuid4()
    doc_expense = uuid.uuid4()
    doc_hr = uuid.uuid4()
    doc_k8s = uuid.uuid4()

    # Benchmark chunks
    chunk_auth_pwd = uuid.uuid4()
    chunk_auth_mfa = uuid.uuid4()
    chunk_vpn_cert = uuid.uuid4()
    chunk_expense_meals = uuid.uuid4()
    chunk_hr_hours = uuid.uuid4()
    chunk_k8s_deploy = uuid.uuid4()

    # Define 5 benchmark queries and their expected ground truth
    benchmark_queries = [
        {
            "query": "How do I reset my account password?",
            "relevant": {chunk_auth_pwd},
            # Simulated semantic candidates
            "sem": [
                (chunk_auth_pwd, 1, 0.92),
                (chunk_auth_mfa, 2, 0.81),
                (chunk_vpn_cert, 3, 0.60),
            ],
            # Simulated keyword candidates
            "kw": [
                (chunk_auth_pwd, 1, 0.45),
                (chunk_hr_hours, 2, 0.12),
            ],
        },
        {
            "query": "Configuring VPN certificates for secure remote connection",
            "relevant": {chunk_vpn_cert},
            "sem": [
                (chunk_vpn_cert, 1, 0.89),
                (chunk_k8s_deploy, 2, 0.65),
                (chunk_auth_mfa, 3, 0.61),
            ],
            "kw": [
                (chunk_vpn_cert, 1, 0.55),
            ],
        },
        {
            "query": "Submitting travel meal expense reports",
            "relevant": {chunk_expense_meals},
            "sem": [
                (chunk_expense_meals, 1, 0.95),
                (chunk_hr_hours, 2, 0.70),
            ],
            "kw": [
                (chunk_expense_meals, 1, 0.60),
                (chunk_auth_pwd, 2, 0.08),
            ],
        },
        {
            "query": "Core working hours and vacation request process",
            "relevant": {chunk_hr_hours},
            "sem": [
                (chunk_hr_hours, 1, 0.90),
                (chunk_expense_meals, 2, 0.68),
            ],
            "kw": [
                (chunk_hr_hours, 1, 0.50),
            ],
        },
        {
            "query": "Deploying container application to Kubernetes production cluster",
            "relevant": {chunk_k8s_deploy},
            "sem": [
                (chunk_k8s_deploy, 1, 0.94),
                (chunk_vpn_cert, 2, 0.64),
            ],
            "kw": [
                (chunk_k8s_deploy, 1, 0.62),
            ],
        },
    ]

    precisions_at_1: List[float] = []
    precisions_at_3: List[float] = []
    recalls_at_3: List[float] = []
    reciprocal_ranks: List[float] = []
    ndcgs_at_3: List[float] = []

    for item in benchmark_queries:
        # Build SemanticSearchItems
        sem_items = [
            SemanticSearchItem(
                chunk_id=cid,
                document_id=doc_auth,
                organization_id=org_id,
                processing_run_id=run_id,
                processing_generation=1,
                chunk_index=0,
                content="content",
                char_start=0,
                char_end=10,
                page_start=1,
                page_end=1,
                section_title="sec",
                chunk_metadata={},
                cosine_distance=round(1.0 - score, 4),
                cosine_similarity=score,
                rank=rank,
            )
            for (cid, rank, score) in item["sem"]
        ]

        # Build KeywordSearchItems
        kw_items = [
            KeywordSearchItem(
                chunk_id=cid,
                document_id=doc_auth,
                organization_id=org_id,
                processing_run_id=run_id,
                processing_generation=1,
                chunk_index=0,
                content="content",
                char_start=0,
                char_end=10,
                page_start=1,
                page_end=1,
                section_title="sec",
                chunk_metadata={},
                keyword_score=score,
                rank=rank,
            )
            for (cid, rank, score) in item["kw"]
        ]

        fused = RrfFusionService.fuse_and_rank(
            semantic_items=sem_items,
            keyword_items=kw_items,
            top_k=5,
            rrf_k=60,
        )

        retrieved_chunk_ids = [c.chunk_id for c in fused]
        ground_truth = item["relevant"]

        precisions_at_1.append(BenchmarkEvaluator.precision_at_k(retrieved_chunk_ids, ground_truth, k=1))
        precisions_at_3.append(BenchmarkEvaluator.precision_at_k(retrieved_chunk_ids, ground_truth, k=3))
        recalls_at_3.append(BenchmarkEvaluator.recall_at_k(retrieved_chunk_ids, ground_truth, k=3))
        reciprocal_ranks.append(BenchmarkEvaluator.reciprocal_rank(retrieved_chunk_ids, ground_truth))
        ndcgs_at_3.append(BenchmarkEvaluator.ndcg_at_k(retrieved_chunk_ids, ground_truth, k=3))

    avg_p_1 = sum(precisions_at_1) / len(precisions_at_1)
    avg_p_3 = sum(precisions_at_3) / len(precisions_at_3)
    avg_recall_3 = sum(recalls_at_3) / len(recalls_at_3)
    mrr = sum(reciprocal_ranks) / len(reciprocal_ranks)
    avg_ndcg_3 = sum(ndcgs_at_3) / len(ndcgs_at_3)

    print("\n--- RETRIEVAL BENCHMARK EVALUATION RESULTS ---")
    print(f"Mean Precision@1: {avg_p_1:.4f}")
    print(f"Mean Precision@3: {avg_p_3:.4f}")
    print(f"Mean Recall@3:    {avg_recall_3:.4f}")
    print(f"MRR (Mean Reciprocal Rank): {mrr:.4f}")
    print(f"Mean nDCG@3:      {avg_ndcg_3:.4f}")

    assert avg_p_1 == 1.0
    assert avg_recall_3 == 1.0
    assert mrr == 1.0
    assert avg_ndcg_3 == 1.0
