export interface MonitoringOverview {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  waitingApprovalRuns: number;
  runningRuns: number;
  successRate: number;
  avgDurationMs: number;
  totalToolCalls: number;
  recentRuns: Array<{
    id: string;
    threadId: string;
    status: string;
    intent?: string | null;
    selectedTool?: string | null;
    durationMs?: number | null;
    createdAt?: string | null;
  }>;
}

export interface WorkflowRunItem {
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

export interface WorkflowCitation {
  chunk_id: string;
  document_id: string;
  filename: string;
  score: number;
  snippet: string;
}

export interface WorkflowRunDetail {
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

export interface WorkflowEvent {
  id: string;
  runId: string;
  type:
    | 'workflow_started'
    | 'plan_generated'
    | 'tool_executed'
    | 'approval_interrupted'
    | 'workflow_completed'
    | 'workflow_failed';
  label: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'running' | 'waiting' | 'failed';
  metadata?: Record<string, unknown>;
}

export interface ToolExecutionMetric {
  toolName: string;
  totalCalls: number;
  requiresApprovalCount: number;
}

export interface WorkflowRunsFilter {
  status?: string;
  workflowName?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}
