export type EvaluationCategory =
  | 'rag_retrieval'
  | 'answer_quality'
  | 'citation_accuracy'
  | 'agent_tool_selection'
  | 'workflow_reliability'
  | 'regression';

export interface EvaluationExampleInput {
  query: string;
  expectedAnswer?: string;
  expectedCitations?: string[];
  expectedTool?: string;
  expectedOutcome?: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluationExampleItem {
  id: string;
  dataset_id: string;
  query: string;
  expected_answer?: string | null;
  expected_citations: string[];
  expected_tool?: string | null;
  expected_outcome?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EvaluationDatasetCreateInput {
  name: string;
  description?: string;
  category: EvaluationCategory;
  examples?: EvaluationExampleInput[];
}

export interface EvaluationDatasetItem {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  category: string;
  version: number;
  example_count: number;
  created_at: string;
  updated_at: string;
}

export interface EvaluationRunCreateInput {
  datasetId: string;
  modelProvider?: string;
  modelName?: string;
  evaluatorMode?: 'deterministic' | 'model_judge' | 'hybrid';
}

export interface EvaluationRunItem {
  id: string;
  organization_id: string;
  dataset_id: string;
  dataset_name?: string | null;
  dataset_version: number;
  category: string;
  model_provider?: string | null;
  model_name?: string | null;
  rubric_version?: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed';
  total_examples: number;
  completed_examples: number;
  failed_examples: number;
  summary_metrics: Record<string, unknown>;
  error_summary?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface EvaluationRunResultItem {
  id: string;
  run_id: string;
  example_id: string;
  query: string;
  output?: string | null;
  status: 'success' | 'failed' | 'skipped';
  metrics: Record<string, unknown>;
  model_judge_score?: number | null;
  model_judge_notes?: string | null;
  error_message?: string | null;
}

export interface EvaluationComparisonResult {
  run_a: EvaluationRunItem;
  run_b: EvaluationRunItem;
  score_deltas: Record<string, number>;
  comparable: boolean;
  notes?: string | null;
}
