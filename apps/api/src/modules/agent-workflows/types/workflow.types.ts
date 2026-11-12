export interface RunWorkflowInput {
  query: string;
  workflowVersion?: string;
  threadId?: string;
  correlationId?: string;
}

export interface WorkflowCitation {
  chunk_id: string;
  document_id: string;
  filename: string;
  score: number;
  snippet: string;
}

export interface WorkflowActionProposal {
  proposal_id: string;
  tool_name: string;
  proposed_action: Record<string, unknown>;
  risk_level: string;
  requires_approval: boolean;
  status: string;
}

export interface WorkflowRunData {
  run_id: string;
  thread_id: string;
  organization_id: string;
  status: 'completed' | 'awaiting_approval' | 'failed' | 'blocked' | 'running';
  intent?: string | null;
  selected_tool?: string | null;
  answer?: string | null;
  citations: WorkflowCitation[];
  insufficient_evidence: boolean;
  requires_approval: boolean;
  proposal?: WorkflowActionProposal | null;
  proposal_id?: string | null;
  error_code?: string | null;
  duration_ms?: number | null;
  total_steps?: number;
  completed_steps?: string[];
  tool_call_count?: number;
  replan_count?: number;
  action_proposals?: Record<string, unknown>[];
  execution_summary?: string | null;
}

export interface RunWorkflowServiceParams {
  organizationId: string;
  userId: string;
  userRole: string;
  query: string;
  workflowVersion?: string;
  threadId?: string;
  correlationId?: string;
}

export interface PythonWorkflowApiResponse {
  success: boolean;
  data?: WorkflowRunData | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

export interface WorkflowRecentRun {
  id: string;
  thread_id: string;
  status: string;
  intent?: string | null;
  selected_tool?: string | null;
  duration_ms?: number | null;
  created_at?: string | null;
}

export interface WorkflowAnalyticsSummary {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  waiting_approval_runs: number;
  running_runs: number;
  success_rate: number;
  avg_duration_ms: number;
  total_tool_calls: number;
  recent_runs: WorkflowRecentRun[];
}

export interface PythonWorkflowAnalyticsResponse {
  success: boolean;
  data?: WorkflowAnalyticsSummary | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

export interface WorkflowRunListItem {
  id: string;
  run_id: string;
  thread_id: string;
  organization_id: string;
  user_id: string;
  workflow_name: string;
  workflow_version: string;
  status: string;
  intent?: string | null;
  selected_tool?: string | null;
  requires_approval: boolean;
  proposal_id?: string | null;
  error_code?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
  total_steps: number;
  completed_steps_count: number;
  tool_call_count: number;
  created_at?: string | null;
}

export interface WorkflowRunListResult {
  items: WorkflowRunListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PythonWorkflowListResponse {
  success: boolean;
  data?: WorkflowRunListResult | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

export interface ListWorkflowRunsParams {
  organizationId: string;
  status?: string;
  workflowName?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}
