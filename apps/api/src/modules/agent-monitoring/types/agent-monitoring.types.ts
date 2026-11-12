export interface WorkflowMonitoringOverview {
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

export interface WorkflowRunEvent {
  id: string;
  runId: string;
  type: 'workflow_started' | 'plan_generated' | 'tool_executed' | 'approval_interrupted' | 'workflow_completed' | 'workflow_failed';
  label: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'running' | 'waiting' | 'failed';
  metadata?: Record<string, unknown>;
}

export interface ToolExecutionSummary {
  toolName: string;
  totalCalls: number;
  requiresApprovalCount: number;
}
