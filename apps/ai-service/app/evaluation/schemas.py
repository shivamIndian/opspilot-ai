"""Pydantic schemas for AI Evaluation datasets, runs, metrics, and comparisons."""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class EvaluationCategory(str, Enum):
    RAG_RETRIEVAL = "rag_retrieval"
    ANSWER_QUALITY = "answer_quality"
    CITATION_ACCURACY = "citation_accuracy"
    AGENT_TOOL_SELECTION = "agent_tool_selection"
    WORKFLOW_RELIABILITY = "workflow_reliability"
    REGRESSION = "regression"


class EvaluationExampleCreate(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="Test input query")
    expected_answer: Optional[str] = Field(None, description="Ground truth answer reference")
    expected_citations: List[str] = Field(default_factory=list, description="Expected source document or chunk IDs")
    expected_tool: Optional[str] = Field(None, description="Expected tool identifier")
    expected_outcome: Optional[str] = Field(None, description="Expected status outcome")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom evaluation metadata")


class EvaluationExampleItem(BaseModel):
    id: str
    dataset_id: str
    query: str
    expected_answer: Optional[str] = None
    expected_citations: List[str] = Field(default_factory=list)
    expected_tool: Optional[str] = None
    expected_outcome: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str


class EvaluationDatasetCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=150, description="Dataset name")
    description: Optional[str] = Field(None, max_length=1000, description="Detailed dataset description")
    category: EvaluationCategory = Field(default=EvaluationCategory.RAG_RETRIEVAL)
    examples: List[EvaluationExampleCreate] = Field(default_factory=list)


class EvaluationDatasetItem(BaseModel):
    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    category: str
    version: int = 1
    example_count: int = 0
    created_at: str
    updated_at: str


class EvaluationRunCreate(BaseModel):
    dataset_id: str = Field(..., description="Target evaluation dataset UUID")
    model_provider: Optional[str] = Field(default="mock", description="LLM provider: mock, openai, gemini")
    model_name: Optional[str] = Field(default="mock-model", description="Model identifier")
    evaluator_mode: str = Field(default="hybrid", description="deterministic, model_judge, or hybrid")


class EvaluationRunItem(BaseModel):
    id: str
    organization_id: str
    dataset_id: str
    dataset_name: Optional[str] = None
    dataset_version: int = 1
    category: str
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    rubric_version: Optional[str] = None
    status: str = "completed"  # queued, running, completed, failed
    total_examples: int = 0
    completed_examples: int = 0
    failed_examples: int = 0
    summary_metrics: Dict[str, Any] = Field(default_factory=dict)
    error_summary: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str


class EvaluationRunResultItem(BaseModel):
    id: str
    run_id: str
    example_id: str
    query: str
    output: Optional[str] = None
    status: str  # success, failed, skipped
    metrics: Dict[str, Any] = Field(default_factory=dict)
    model_judge_score: Optional[float] = None
    model_judge_notes: Optional[str] = None
    error_message: Optional[str] = None


class EvaluationComparisonResult(BaseModel):
    run_a: EvaluationRunItem
    run_b: EvaluationRunItem
    score_deltas: Dict[str, float]
    comparable: bool
    notes: Optional[str] = None
