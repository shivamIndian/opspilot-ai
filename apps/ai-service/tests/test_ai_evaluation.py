"""Automated test suite for Module 23 AI Evaluation Framework."""

import pytest
import uuid
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.config.settings import settings
from app.evaluation.metrics import EvaluationMetrics


def test_information_retrieval_metrics():
    """Validates deterministic formulas for IR metrics: Precision@K, Recall@K, MRR, NDCG."""
    retrieved = ["doc-1", "doc-2", "doc-3", "doc-4", "doc-5"]
    relevant = {"doc-1", "doc-3", "doc-9"}

    # Precision@K: 2 hits in top 5 -> 2/5 = 0.4
    prec5 = EvaluationMetrics.precision_at_k(retrieved, relevant, k=5)
    assert prec5 == 0.4

    # Recall@K: 2 hits out of 3 relevant -> 2/3 = 0.6667
    rec5 = EvaluationMetrics.recall_at_k(retrieved, relevant, k=5)
    assert rec5 == 0.6667

    # Reciprocal Rank: first hit is at rank 1 -> 1/1 = 1.0
    rr = EvaluationMetrics.reciprocal_rank(retrieved, relevant)
    assert rr == 1.0

    # NDCG@5 should be > 0.5
    ndcg5 = EvaluationMetrics.ndcg_at_k(retrieved, relevant, k=5)
    assert ndcg5 > 0.5

    # Hit Rate: at least one hit in top 5
    hit = EvaluationMetrics.hit_rate(retrieved, relevant, k=5)
    assert hit == 1.0


def test_citation_and_tool_evaluation():
    """Validates citation validity checks and tool selection evaluations."""
    cited = ["chunk-1", "chunk-2", "chunk-fake"]
    retrieved = {"chunk-1", "chunk-2"}

    citation_res = EvaluationMetrics.evaluate_citation_validity(cited, retrieved)
    assert citation_res["total_citations"] == 3
    assert citation_res["valid_citations"] == 2
    assert citation_res["hallucinated_citations"] == 1
    assert citation_res["validity_rate"] == 66.7

    assert EvaluationMetrics.evaluate_tool_selection("tickets_get_details", "tickets_get_details") is True
    assert EvaluationMetrics.evaluate_tool_selection("tickets_get_details", "tickets_update_priority") is False
    assert EvaluationMetrics.evaluate_approval_compliance(True, True) is True
    assert EvaluationMetrics.evaluate_approval_compliance(False, True) is False


@pytest.mark.asyncio
async def test_evaluation_api_endpoints():
    """Tests evaluation datasets, runs execution, and run comparison via internal API."""
    org_id = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {settings.AI_SERVICE_INTERNAL_TOKEN}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Unauthorized check
        unauth_res = await ac.get(f"/internal/v1/evaluation/datasets?organization_id={org_id}")
        assert unauth_res.status_code == 401

        # 2. List initial pre-seeded benchmark datasets
        ds_res = await ac.get(f"/internal/v1/evaluation/datasets?organization_id={org_id}", headers=headers)
        assert ds_res.status_code == 200
        datasets = ds_res.json()
        assert len(datasets) >= 2
        rag_dataset = next(d for d in datasets if d["category"] == "rag_retrieval")

        # 3. Create custom dataset
        create_payload = {
            "name": "Custom Incident Triage Evaluation",
            "description": "Benchmark testing automated triage and categorization",
            "category": "agent_tool_selection",
            "examples": [
                {
                    "query": "Categorize and escalate severe network packet loss",
                    "expected_tool": "tickets_update_priority",
                    "metadata": {"criticality": "high"},
                }
            ],
        }
        create_res = await ac.post(
            f"/internal/v1/evaluation/datasets?organization_id={org_id}",
            json=create_payload,
            headers=headers,
        )
        assert create_res.status_code == 201
        created_ds = create_res.json()
        assert created_ds["name"] == "Custom Incident Triage Evaluation"
        assert created_ds["example_count"] == 1

        # 4. Execute evaluation run on RAG dataset
        run_payload = {
            "dataset_id": rag_dataset["id"],
            "model_provider": "mock",
            "model_name": "mock-evaluator",
            "evaluator_mode": "hybrid",
        }
        run_res_1 = await ac.post(
            f"/internal/v1/evaluation/runs?organization_id={org_id}",
            json=run_payload,
            headers=headers,
        )
        assert run_res_1.status_code == 201
        run_1 = run_res_1.json()
        assert run_1["status"] == "completed"
        assert run_1["total_examples"] >= 2
        assert "mean_recall_at_5" in run_1["summary_metrics"]

        # 5. Execute second run for comparison
        run_res_2 = await ac.post(
            f"/internal/v1/evaluation/runs?organization_id={org_id}",
            json=run_payload,
            headers=headers,
        )
        assert run_res_2.status_code == 201
        run_2 = run_res_2.json()

        # 6. Compare runs
        compare_res = await ac.get(
            f"/internal/v1/evaluation/compare?organization_id={org_id}&run_id_a={run_1['id']}&run_id_b={run_2['id']}",
            headers=headers,
        )
        assert compare_res.status_code == 200
        comp = compare_res.json()
        assert comp["comparable"] is True
        assert "mean_recall_at_5" in comp["score_deltas"]

        # 7. Get run results
        results_res = await ac.get(
            f"/internal/v1/evaluation/runs/{run_1['id']}/results?organization_id={org_id}",
            headers=headers,
        )
        assert results_res.status_code == 200
        items = results_res.json()
        assert len(items) >= 2
        assert items[0]["status"] == "success"
