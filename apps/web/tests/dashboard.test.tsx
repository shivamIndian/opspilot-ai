import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboardPage } from '@/features/dashboard/pages/AdminDashboardPage';
import { dashboardService } from '@/features/dashboard/services/dashboard.service';
import type { DashboardOverviewData } from '@/features/dashboard/types/dashboard.types';

const mockDashboardData: DashboardOverviewData = {
  period: {
    key: '30d',
    fromDate: '2026-10-05T00:00:00.000Z',
    toDate: '2026-11-04T00:00:00.000Z',
  },
  kpis: {
    openTickets: 12,
    unassignedTickets: 3,
    urgentTickets: 2,
    pendingApprovals: 4,
    activeDocuments: 18,
    aiWorkflowsTotal: 85,
    aiSuccessRate: 97.6,
    avgWorkflowDurationMs: 1420.5,
  },
  tickets: {
    total: 35,
    statusDistribution: {
      open: 6,
      in_progress: 4,
      waiting_on_customer: 2,
      resolved: 18,
      closed: 5,
    },
    priorityDistribution: {
      urgent: 2,
      high: 8,
      medium: 18,
      low: 7,
    },
    volumeTrend: [
      { date: '2026-11-01', created: 3, resolved: 2 },
      { date: '2026-11-02', created: 4, resolved: 4 },
    ],
    recentTickets: [
      {
        id: 'tick-101',
        ticketNumber: 101,
        formattedTicketNumber: 'TICK-000101',
        subject: 'Database connection pool exhausted',
        priority: 'urgent',
        status: 'open',
        creatorName: 'DevOps Lead',
        assigneeName: 'Senior SRE',
        createdAt: '2026-11-04T08:00:00.000Z',
      },
      {
        id: 'tick-102',
        ticketNumber: 102,
        formattedTicketNumber: 'TICK-000102',
        subject: 'Request for staging credentials',
        priority: 'low',
        status: 'resolved',
        creatorName: 'QA Intern',
        assigneeName: null,
        createdAt: '2026-11-03T14:30:00.000Z',
      },
    ],
  },
  documents: {
    total: 20,
    active: 18,
    archived: 2,
    processingStatus: {
      pending: 0,
      queued: 0,
      processing: 1,
      completed: 18,
      failed: 1,
    },
    embeddingStatus: {
      pending: 0,
      queued: 0,
      processing: 1,
      completed: 18,
      failed: 1,
      skipped: 0,
    },
    totalChunks: 640,
    embeddedChunks: 620,
  },
  aiActivity: {
    total_runs: 85,
    successful_runs: 83,
    failed_runs: 2,
    waiting_approval_runs: 4,
    running_runs: 0,
    success_rate: 97.6,
    avg_duration_ms: 1420.5,
    total_tool_calls: 195,
    recent_runs: [
      {
        id: 'run-1',
        thread_id: 'thread-1',
        status: 'completed',
        intent: 'knowledge_question',
        selected_tool: 'search_knowledge_base',
        duration_ms: 1200,
        created_at: '2026-11-04T09:00:00.000Z',
      },
    ],
  },
  approvals: {
    pendingCount: 4,
    totalProposals: 22,
    statusDistribution: {
      awaiting_approval: 4,
      approved: 16,
      rejected: 2,
      executed: 16,
      failed: 0,
      cancelled: 0,
    },
    recentPending: [
      {
        id: 'prop-1',
        toolName: 'update_support_ticket',
        actionType: 'update_ticket',
        riskLevel: 'high',
        createdAt: '2026-11-04T08:30:00.000Z',
        expiresAt: null,
      },
    ],
  },
  recentActivity: [
    {
      id: 'act-1',
      action: 'ticket.created',
      actorName: 'DevOps Lead',
      actorEmail: 'lead@opspilot.test',
      targetType: 'ticket',
      targetId: 'tick-101',
      metadata: { priority: 'urgent' },
      createdAt: '2026-11-04T08:00:00.000Z',
    },
  ],
};

function renderWithClient(
  ui: React.ReactElement,
  {
    orgRole = 'admin',
    initialEntries = ['/organizations/org-test-123/dashboard'],
  }: { orgRole?: 'owner' | 'admin' | 'member'; initialEntries?: string[] } = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const OutletWrapper: React.FC = () => {
    return (
      <Routes>
        <Route
          path="/organizations/:organizationId"
          element={
            <div
              data-outlet-context={JSON.stringify({
                organization: {
                  id: 'org-test-123',
                  name: 'Acme Global Ops',
                  slug: 'acme-global',
                  role: orgRole,
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              })}
            >
              <Routes>
                <Route path="dashboard" element={ui} />
              </Routes>
            </div>
          }
        />
      </Routes>
    );
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <OutletWrapper />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Mock useOutletContext to provide organization
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => ({
      organization: {
        id: 'org-test-123',
        name: 'Acme Global Ops',
        slug: 'acme-global',
        role: (globalThis as any).__mockOrgRole || 'admin',
      },
    }),
  };
});

describe('AdminDashboardPage (Module 18)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).__mockOrgRole = 'admin';
  });

  it('renders operations dashboard overview with real KPI metrics and sub-widgets', async () => {
    vi.spyOn(dashboardService, 'getOverview').mockResolvedValue(mockDashboardData);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/organizations/org-test-123/dashboard']}>
          <Routes>
            <Route path="/organizations/:organizationId/dashboard" element={<AdminDashboardPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify Title & Organization Name
    expect(screen.getByText('Operations & AI Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Acme Global Ops')).toBeInTheDocument();

    // Verify KPI Cards
    await waitFor(() => {
      expect(screen.getByText('Active Support Tickets')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      expect(screen.getByText('Active Documents (RAG)')).toBeInTheDocument();
      expect(screen.getAllByText('18').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('AI Workflow Runs')).toBeInTheDocument();
      expect(screen.getAllByText('85').length).toBeGreaterThanOrEqual(1);
    });

    // Verify Ticket Operations Section
    expect(screen.getByText('Support Ticket Operations')).toBeInTheDocument();
    expect(screen.getByText(/35 total ticket\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText('Priority Breakdown')).toBeInTheDocument();

    // Verify AI Telemetry
    expect(screen.getByText('AI Agent Activity & Telemetry')).toBeInTheDocument();
    expect(screen.getByText('Execution Reliability')).toBeInTheDocument();

    // Verify Recent Tickets Table
    expect(screen.getByText('TICK-000101')).toBeInTheDocument();
    expect(screen.getByText('Database connection pool exhausted')).toBeInTheDocument();

    // Verify Recent Activity Feed
    expect(screen.getByText('Organization Audit Stream')).toBeInTheDocument();
    expect(screen.getByText('ticket.created')).toBeInTheDocument();
  });

  it('allows switching period filter and re-queries dashboard metrics', async () => {
    const getOverviewSpy = vi
      .spyOn(dashboardService, 'getOverview')
      .mockResolvedValue(mockDashboardData);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/organizations/org-test-123/dashboard']}>
          <Routes>
            <Route path="/organizations/:organizationId/dashboard" element={<AdminDashboardPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(getOverviewSpy).toHaveBeenCalledWith('org-test-123', '30d');
    });

    // Click "7 Days" button
    const sevenDaysBtn = screen.getByRole('button', { name: '7 Days' });
    fireEvent.click(sevenDaysBtn);

    await waitFor(() => {
      expect(getOverviewSpy).toHaveBeenCalledWith('org-test-123', '7d');
    });
  });

  it('restricts access with warning banner when user role is regular member', () => {
    (globalThis as any).__mockOrgRole = 'member';

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/organizations/org-test-123/dashboard']}>
          <Routes>
            <Route path="/organizations/:organizationId/dashboard" element={<AdminDashboardPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(
      screen.getByText(/Access Restricted: Administrator Privileges Required/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Return to Workspace Overview/i)).toBeInTheDocument();
  });

  it('renders error alert with retry button when query fails', async () => {
    vi.spyOn(dashboardService, 'getOverview').mockRejectedValue(
      new Error('Network error loading metrics')
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/organizations/org-test-123/dashboard']}>
          <Routes>
            <Route path="/organizations/:organizationId/dashboard" element={<AdminDashboardPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard metrics')).toBeInTheDocument();
      expect(screen.getByText('Network error loading metrics')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
});
