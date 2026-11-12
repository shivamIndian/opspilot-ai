import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentMonitoringPage } from '@/features/agent-monitoring/pages/AgentMonitoringPage';
import { WorkflowRunDetailPage } from '@/features/agent-monitoring/pages/WorkflowRunDetailPage';
import { agentMonitoringService } from '@/features/agent-monitoring/services/agent-monitoring.service';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { useAuthStore } from '@/store/useAuthStore';
import type {
  MonitoringOverview,
  WorkflowRunItem,
  WorkflowRunDetail,
  WorkflowEvent,
  ToolExecutionMetric,
} from '@/features/agent-monitoring/types/agent-monitoring.types';

const mockOverview: MonitoringOverview = {
  totalRuns: 24,
  successfulRuns: 20,
  failedRuns: 2,
  waitingApprovalRuns: 2,
  runningRuns: 0,
  successRate: 83.3,
  avgDurationMs: 1450.0,
  totalToolCalls: 36,
  recentRuns: [
    {
      id: 'run-101',
      threadId: 'thread-alpha',
      status: 'completed',
      intent: 'knowledge_question',
      selectedTool: 'search_knowledge_base',
      durationMs: 950.0,
      createdAt: '2026-11-04T12:00:00.000Z',
    },
  ],
};

const mockRuns: WorkflowRunItem[] = [
  {
    id: 'run-101',
    run_id: 'run-101',
    thread_id: 'thread-alpha',
    organization_id: 'org-1',
    user_id: 'user-admin',
    workflow_name: 'opspilot_support_workflow',
    workflow_version: 'v1.0',
    status: 'completed',
    intent: 'knowledge_question',
    selected_tool: 'search_knowledge_base',
    requires_approval: false,
    proposal_id: null,
    error_code: null,
    started_at: '2026-11-04T12:00:00.000Z',
    completed_at: '2026-11-04T12:00:01.000Z',
    duration_ms: 950.0,
    total_steps: 1,
    completed_steps_count: 1,
    tool_call_count: 1,
    created_at: '2026-11-04T12:00:00.000Z',
  },
  {
    id: 'run-102',
    run_id: 'run-102',
    thread_id: 'thread-beta',
    organization_id: 'org-1',
    user_id: 'user-admin',
    workflow_name: 'opspilot_support_workflow',
    workflow_version: 'v1.0',
    status: 'awaiting_approval',
    intent: 'ticket_update_request',
    selected_tool: 'tickets_update_priority',
    requires_approval: true,
    proposal_id: 'prop-888',
    error_code: null,
    started_at: '2026-11-04T12:05:00.000Z',
    completed_at: null,
    duration_ms: null,
    total_steps: 2,
    completed_steps_count: 1,
    tool_call_count: 1,
    created_at: '2026-11-04T12:05:00.000Z',
  },
];

const mockToolMetrics: ToolExecutionMetric[] = [
  {
    toolName: 'search_knowledge_base',
    totalCalls: 25,
    requiresApprovalCount: 0,
  },
  {
    toolName: 'tickets_update_priority',
    totalCalls: 11,
    requiresApprovalCount: 8,
  },
];

const mockRunDetail: WorkflowRunDetail = {
  run_id: 'run-102',
  thread_id: 'thread-beta',
  organization_id: 'org-1',
  status: 'awaiting_approval',
  intent: 'ticket_update_request',
  selected_tool: 'tickets_update_priority',
  answer: null,
  citations: [],
  insufficient_evidence: false,
  requires_approval: true,
  proposal_id: 'prop-888',
  error_code: null,
  duration_ms: 620.0,
  total_steps: 2,
  completed_steps: ['step_1'],
  tool_call_count: 1,
  replan_count: 0,
  action_proposals: [],
  execution_summary: 'Proposed escalation of ticket priority to urgent.',
};

const mockEvents: WorkflowEvent[] = [
  {
    id: 'evt-1',
    runId: 'run-102',
    type: 'workflow_started',
    label: 'Workflow Initialized',
    description: 'Workflow execution started for thread thread-beta.',
    timestamp: '2026-11-04T12:05:00.000Z',
    status: 'completed',
  },
  {
    id: 'evt-2',
    runId: 'run-102',
    type: 'plan_generated',
    label: 'Execution Plan Created',
    description: 'Generated structured operational plan with 2 step(s).',
    timestamp: '2026-11-04T12:05:01.000Z',
    status: 'completed',
  },
  {
    id: 'evt-3',
    runId: 'run-102',
    type: 'approval_interrupted',
    label: 'Human-in-the-Loop Interruption',
    description: 'High-risk action proposal (prop-888) submitted. Thread suspended awaiting approval.',
    timestamp: '2026-11-04T12:05:02.000Z',
    status: 'waiting',
  },
];

describe('Module 22 — Agent Monitoring & Observability UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useOrganizationStore.getState().setActiveOrganization({
      id: 'org-1',
      name: 'Acme Enterprise',
      slug: 'acme-enterprise',
      role: 'owner',
      createdAt: '2026-11-04T00:00:00.000Z',
      updatedAt: '2026-11-04T00:00:00.000Z',
    } as any);

    useAuthStore.getState().setUser({
      id: 'user-admin',
      email: 'admin@opspilot.internal',
      name: 'Lead SRE',
      isSuperAdmin: false,
    } as any);

    vi.spyOn(agentMonitoringService, 'getOverview').mockResolvedValue(mockOverview);
    vi.spyOn(agentMonitoringService, 'listRuns').mockResolvedValue({
      items: mockRuns,
      total: 2,
      page: 1,
      limit: 15,
      totalPages: 1,
    });
    vi.spyOn(agentMonitoringService, 'getToolExecutions').mockResolvedValue(mockToolMetrics);
    vi.spyOn(agentMonitoringService, 'getRunDetails').mockResolvedValue(mockRunDetail);
    vi.spyOn(agentMonitoringService, 'getRunEvents').mockResolvedValue(mockEvents);
  });

  const renderComponent = (initialEntry: string) =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              path="/organizations/:organizationId/agent-monitoring"
              element={<AgentMonitoringPage />}
            />
            <Route
              path="/organizations/:organizationId/agent-monitoring/runs/:runId"
              element={<WorkflowRunDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders Agent Monitoring dashboard with real KPI metrics and tool execution bars', async () => {
    renderComponent('/organizations/org-1/agent-monitoring');

    await waitFor(() => {
      expect(
        screen.getByText(/AI Agent Observability & Workflow Monitoring/i)
      ).toBeInTheDocument();
      // Overview cards
      expect(screen.getByText('24')).toBeInTheDocument();
      expect(screen.getByText('83.3%')).toBeInTheDocument();
      expect(screen.getByText('1.45s')).toBeInTheDocument();
      expect(screen.getByText('36')).toBeInTheDocument();
    });

    // Tool breakdown
    expect(screen.getByText(/Registered Tool Execution Frequency/i)).toBeInTheDocument();
    expect(screen.getAllByText('search_knowledge_base').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('25 call(s)')).toBeInTheDocument();
    expect(screen.getAllByText('tickets_update_priority').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/8 proposed/i)).toBeInTheDocument();
  });

  it('renders workflow runs table with status badges and proposal links', async () => {
    renderComponent('/organizations/org-1/agent-monitoring');

    await waitFor(() => {
      expect(screen.getByText('run-101...')).toBeInTheDocument();
      expect(screen.getByText('run-102...')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Completed/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Awaiting Approval/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Review Proposal/i)).toBeInTheDocument();
  });

  it('filters workflow runs by clicking status tab pill', async () => {
    renderComponent('/organizations/org-1/agent-monitoring');

    await waitFor(() => {
      expect(screen.getByText('All Workflows')).toBeInTheDocument();
    });

    const failedTab = screen.getByRole('button', { name: 'Failed' });
    fireEvent.click(failedTab);

    await waitFor(() => {
      expect(agentMonitoringService.listRuns).toHaveBeenCalledWith('org-1', {
        status: 'failed',
        search: undefined,
        page: 1,
        limit: 15,
      });
    });
  });

  it('renders WorkflowRunDetailPage with metadata, proposal banner, and lifecycle events timeline', async () => {
    renderComponent('/organizations/org-1/agent-monitoring/runs/run-102');

    await waitFor(() => {
      expect(screen.getByText('run-102')).toBeInTheDocument();
      expect(screen.getByText('ticket update request')).toBeInTheDocument();
      expect(screen.getByText(/Requires Human Authorization/i)).toBeInTheDocument();
    });

    // Verify Action proposal button exists
    expect(screen.getByRole('link', { name: /Review Action Proposal/i })).toBeInTheDocument();

    // Verify lifecycle timeline events rendered
    expect(
      screen.getByText(/Workflow Lifecycle & Node Execution Timeline/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Workflow Initialized')).toBeInTheDocument();
    expect(screen.getByText('Execution Plan Created')).toBeInTheDocument();
    expect(screen.getByText('Human-in-the-Loop Interruption')).toBeInTheDocument();
  });
});
