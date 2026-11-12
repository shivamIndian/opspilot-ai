# Module 23: AI Quality Evaluation & Benchmark Control Plane Documentation

## 1. Overview & Architecture

Module 23 introduces an enterprise-grade AI Quality Evaluation and Benchmark Control Plane for OpsPilot AI. It enables organizations, AI engineers, and compliance teams to systematically evaluate, benchmark, and regression-test AI agent performance, RAG retrieval quality, citation accuracy, and tool selection reliability against versioned test collections.

### Core Capabilities

1. **Deterministic Information Retrieval (IR) Metrics**:
   - `Precision@K`, `Recall@K`, `HitRate@K` for evaluating chunk retrieval against gold standard document sets.
   - `Mean Reciprocal Rank (MRR)` and `Normalized Discounted Cumulative Gain (NDCG@K)` to assess ranking quality.
   - Citation validity verification: confirms all emitted source citations strictly match retrieved context IDs.

2. **Structured LLM-as-a-Judge Evaluation**:
   - Evaluates answer faithfulness, relevance, and semantic accuracy against structured rubrics.
   - Constrained via Pydantic model (`JudgeEvaluationResult`) with normalized scores (0–5) and human-readable feedback.
   - Redacts model internal scratchpads, private chain-of-thought, and system prompt secrets.

3. **Agent Tool Selection & Reliability Assessment**:
   - Compares selected business tool invocations against ground-truth expected tools.
   - Measures human approval compliance: verifies that dangerous mutations always generate proposals without unapproved database writes.

4. **Run Comparison & Prompt Regression Tracking**:
   - Direct side-by-side run comparison on identical or differing benchmarks.
   - Computes signed metric deltas (e.g. `+5.5%` overall score, `+0.07` MRR).
   - Flags regressions and alerts operators when model upgrades or prompt changes cause accuracy drops.

5. **Tenant Isolation & Security Guardrails**:
   - Datasets, test samples, and benchmark runs are strictly scoped by `organization_id` at every layer (Python AI Service, Node.js API, React Frontend).
   - Zero fabricated metrics; benchmark results are computed and persisted in real time.

---

## 2. API Endpoints

### Node.js Enterprise API (`/api/v1/organizations/:organizationId/ai-evaluation`)

- `GET /datasets`: Retrieves all versioned evaluation datasets for the active organization.
- `POST /datasets`: Creates a new evaluation dataset category.
- `GET /datasets/:datasetId`: Retrieves details and test examples for a specific benchmark dataset.
- `POST /datasets/:datasetId/examples`: Appends new test examples with ground truth expectations.
- `GET /runs`: Lists all executed benchmark runs with status, category, model, and overall score.
- `POST /runs`: Triggers a new automated evaluation run for a dataset.
- `GET /runs/:runId`: Retrieves comprehensive summary metrics and configuration of a run.
- `GET /runs/:runId/results`: Retrieves individual test case outputs, scores, and judge notes.
- `GET /compare`: Computes comparative score deltas between two benchmark runs.

### Python AI Internal Microservice (`/internal/v1/evaluation`)

- `GET /datasets`: Lists organization datasets.
- `POST /datasets`: Creates dataset.
- `GET /datasets/{dataset_id}`: Retrieves dataset and examples.
- `POST /datasets/{dataset_id}/examples`: Adds examples to dataset.
- `GET /runs`: Lists evaluation runs.
- `POST /runs`: Executes automated evaluation benchmark run.
- `GET /runs/{run_id}`: Retrieves run details.
- `GET /runs/{run_id}/results`: Retrieves itemized sample evaluations.
- `GET /compare`: Compares two evaluation runs and calculates metric deltas.

---

## 3. UI / UX Components (`apps/web/src/features/ai-evaluation`)

- **`AIEvaluationPage`**: Primary control plane tabbed interface (Datasets, Runs, Comparison).
- **`EvaluationOverviewCards`**: KPI summary metrics (Benchmark Datasets, Evaluation Runs, Mean Recall@5, Tool Accuracy, Model Faithfulness, Citation Validity).
- **`EvaluationDatasetsTable`**: Browse, create, and launch automated benchmark runs.
- **`EvaluationRunsTable`**: Review execution history, status badges, model providers, and overall scores with direct links to detail views.
- **`RunComparisonView`**: Side-by-side comparison of two runs with signed score deltas and improvement/regression badges.
- **`EvaluationRunDetailPage`**: In-depth trace inspection for a specific run, displaying overall scores, sub-metrics, and expandable test sample cards with inputs, actual outputs, metric chips, and judge notes.

---

## 4. Verification & Testing

- **Python AI Service (`apps/ai-service/tests/test_ai_evaluation.py`)**:
  - Validates deterministic IR metrics (MRR, NDCG, Precision, Recall, Citation Accuracy).
  - Tests dataset creation and benchmark execution endpoint.
  - Tests run comparison endpoint and metric deltas.
  - **169/169** passing pytest tests.
- **Node.js API (`apps/api/tests/ai-evaluation.test.ts`)**:
  - Validates tenant authorization guardrails (403 for non-members).
  - Validates dataset creation, run execution, run details, results listing, and run comparison.
  - **239/239** passing vitest tests across 19 test files.
- **React Frontend (`apps/web/tests/ai-evaluation.test.tsx`)**:
  - Validates control plane page rendering, KPI overview cards, dataset list, benchmark triggering, tab switching, run comparison view, and run detail trace inspection.
  - **70/70** passing vitest tests across 11 test files.
- **Typecheck & Production Build**:
  - `tsc --noEmit` &rarr; 0 errors across all workspaces.
  - Vite build &rarr; Clean build in 8.28s.
