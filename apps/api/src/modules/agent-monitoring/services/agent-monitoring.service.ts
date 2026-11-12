import { aiWorkflowClient } from '../../agent-workflows/client/ai-workflow.client.js';
import type {
  WorkflowMonitoringOverview,
  WorkflowRunEvent,
  ToolExecutionSummary,
} from '../types/agent-monitoring.types.js';
import type {
  WorkflowRunData,
  WorkflowRunListResult,
  ListWorkflowRunsParams,
} from '../../agent-workflows/types/workflow.types.js';

export class AgentMonitoringService {
  async getOverview(
    organizationId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<WorkflowMonitoringOverview> {
    const raw = await aiWorkflowClient.getWorkflowAnalytics(organizationId, fromDate, toDate);

    return {
      totalRuns: raw.total_runs,
      successfulRuns: raw.successful_runs,
      failedRuns: raw.failed_runs,
      waitingApprovalRuns: raw.waiting_approval_runs,
      runningRuns: raw.running_runs,
      successRate: raw.success_rate,
      avgDurationMs: raw.avg_duration_ms,
      totalToolCalls: raw.total_tool_calls,
      recentRuns: (raw.recent_runs || []).map((r) => ({
        id: r.id,
        threadId: r.thread_id,
        status: r.status,
        intent: r.intent,
        selectedTool: r.selected_tool,
        durationMs: r.duration_ms,
        createdAt: r.created_at,
      })),
    };
  }

  async listRuns(params: ListWorkflowRunsParams): Promise<WorkflowRunListResult> {
    return aiWorkflowClient.listWorkflowRuns(params);
  }

  async getRunDetails(organizationId: string, runId: string): Promise<WorkflowRunData> {
    return aiWorkflowClient.getRunStatus(organizationId, runId);
  }

  async getRunEvents(organizationId: string, runId: string): Promise<WorkflowRunEvent[]> {
    const run = await aiWorkflowClient.getRunStatus(organizationId, runId);
    const events: WorkflowRunEvent[] = [];

    const baseTime = new Date().toISOString();

    // 1. Started event
    events.push({
      id: `evt-${run.run_id}-started`,
      runId: run.run_id,
      type: 'workflow_started',
      label: 'Workflow Initialized',
      description: `Workflow execution started for thread ${run.thread_id}. Intent: ${run.intent || 'support_inquiry'}.`,
      timestamp: baseTime,
      status: 'completed',
      metadata: {
        intent: run.intent,
        threadId: run.thread_id,
      },
    });

    // 2. Planning event
    if ((run.total_steps ?? 0) > 0 || run.selected_tool) {
      events.push({
        id: `evt-${run.run_id}-plan`,
        runId: run.run_id,
        type: 'plan_generated',
        label: 'Execution Plan Created',
        description: `Generated structured operational plan with ${run.total_steps || 1} step(s).`,
        timestamp: baseTime,
        status: 'completed',
        metadata: {
          totalSteps: run.total_steps,
          completedSteps: run.completed_steps || [],
        },
      });
    }

    // 3. Tool execution event
    if ((run.tool_call_count ?? 0) > 0 || run.selected_tool) {
      events.push({
        id: `evt-${run.run_id}-tool`,
        runId: run.run_id,
        type: 'tool_executed',
        label: 'Tool Invocation',
        description: `Executed registered tool: ${run.selected_tool || 'knowledge_retrieval'}. Total invocations: ${run.tool_call_count || 1}.`,
        timestamp: baseTime,
        status: 'completed',
        metadata: {
          toolName: run.selected_tool,
          toolCallCount: run.tool_call_count,
        },
      });
    }

    // 4. Approval request event
    if (run.requires_approval || run.proposal_id) {
      events.push({
        id: `evt-${run.run_id}-approval`,
        runId: run.run_id,
        type: 'approval_interrupted',
        label: 'Human-in-the-Loop Interruption',
        description: run.proposal_id
          ? `High-risk action proposal (${run.proposal_id}) submitted. Thread suspended awaiting approval.`
          : 'High-risk action requires administrative approval before state mutation.',
        timestamp: baseTime,
        status: run.status === 'awaiting_approval' ? 'waiting' : 'completed',
        metadata: {
          proposalId: run.proposal_id,
          requiresApproval: run.requires_approval,
        },
      });
    }

    // 5. Final completion or failure
    if (run.status === 'completed') {
      events.push({
        id: `evt-${run.run_id}-completed`,
        runId: run.run_id,
        type: 'workflow_completed',
        label: 'Workflow Completed',
        description: `Execution finalized cleanly in ${run.duration_ms ? (run.duration_ms / 1000).toFixed(2) + 's' : 'subsecond'}.`,
        timestamp: baseTime,
        status: 'completed',
        metadata: {
          durationMs: run.duration_ms,
        },
      });
    } else if (run.status === 'failed') {
      events.push({
        id: `evt-${run.run_id}-failed`,
        runId: run.run_id,
        type: 'workflow_failed',
        label: 'Workflow Failed',
        description: `Execution failed with error code: ${run.error_code || 'INTERNAL_ERROR'}.`,
        timestamp: baseTime,
        status: 'failed',
        metadata: {
          errorCode: run.error_code,
        },
      });
    }

    return events;
  }

  async getToolExecutions(organizationId: string): Promise<ToolExecutionSummary[]> {
    const runsResult = await aiWorkflowClient.listWorkflowRuns({
      organizationId,
      page: 1,
      limit: 50,
    });

    const toolMap = new Map<string, { totalCalls: number; requiresApprovalCount: number }>();

    for (const run of runsResult.items) {
      if (run.selected_tool) {
        const current = toolMap.get(run.selected_tool) || { totalCalls: 0, requiresApprovalCount: 0 };
        current.totalCalls += run.tool_call_count || 1;
        if (run.requires_approval) {
          current.requiresApprovalCount += 1;
        }
        toolMap.set(run.selected_tool, current);
      }
    }

    const summaries: ToolExecutionSummary[] = [];
    for (const [toolName, stats] of toolMap.entries()) {
      summaries.push({
        toolName,
        totalCalls: stats.totalCalls,
        requiresApprovalCount: stats.requiresApprovalCount,
      });
    }

    return summaries.sort((a, b) => b.totalCalls - a.totalCalls);
  }
}

export const agentMonitoringService = new AgentMonitoringService();
