import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TicketsPage } from '@/features/tickets/pages/TicketsPage';
import { TicketDetailsPage } from '@/features/tickets/pages/TicketDetailsPage';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { ApprovalDetailPage } from '@/features/agent-approvals/pages/ApprovalDetailPage';
import { ticketService } from '@/features/tickets/services/ticket.service';
import { agentApprovalService } from '@/features/agent-approvals/services/agent-approval.service';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { SafeTicket } from '@/features/tickets/types/ticket.types';
import type { SafeAgentProposal } from '@/features/agent-approvals/types/agent-approvals.types';

const mockTickets: SafeTicket[] = [
  {
    id: 'ticket-1',
    ticketNumber: 101,
    formattedTicketNumber: 'TICK-000101',
    organizationId: 'org-1',
    createdByUserId: 'user-1',
    assignedToUserId: 'user-2',
    subject: 'Production API Gateway 502 Outage',
    description: 'High rate of 502 errors observed on the main Kubernetes ingress controller.',
    status: 'open',
    priority: 'urgent',
    category: 'incident',
    metadata: {},
    createdAt: '2026-11-04T10:00:00.000Z',
    updatedAt: '2026-11-04T10:05:00.000Z',
    archivedAt: null,
    creator: {
      id: 'user-1',
      name: 'Incident Commander',
      email: 'incident@opspilot.internal',
    },
    assignee: {
      id: 'user-2',
      name: 'Senior SRE',
      email: 'sre@opspilot.internal',
    },
  },
  {
    id: 'ticket-2',
    ticketNumber: 102,
    formattedTicketNumber: 'TICK-000102',
    organizationId: 'org-1',
    createdByUserId: 'user-3',
    assignedToUserId: null,
    subject: 'Request for staging database credentials',
    description: 'Need read-only access to verify migrations on staging cluster.',
    status: 'in_progress',
    priority: 'medium',
    category: 'access_request',
    metadata: {},
    createdAt: '2026-11-04T09:00:00.000Z',
    updatedAt: '2026-11-04T09:30:00.000Z',
    archivedAt: null,
    creator: {
      id: 'user-3',
      name: 'QA Engineer',
      email: 'qa@opspilot.internal',
    },
    assignee: null,
  },
];

const mockProposals: SafeAgentProposal[] = [
  {
    id: 'prop-101',
    organizationId: 'org-1',
    runId: 'run-1',
    threadId: 'thread-1',
    requestedBy: 'user-agent',
    requesterName: 'OpsPilot Assistant',
    requesterEmail: 'agent@opspilot.internal',
    actionType: 'update_ticket_priority',
    toolName: 'tickets_update_priority',
    riskLevel: 'high',
    proposedAction: {
      ticketId: 'ticket-1',
      priority: 'urgent',
      reason: 'Automated triage based on production service impact',
    },
    status: 'awaiting_approval',
    justification: 'Critical business impact detected in error telemetry runbook.',
    createdAt: '2026-11-04T10:02:00.000Z',
    updatedAt: '2026-11-04T10:02:00.000Z',
    expiresAt: '2026-11-05T10:02:00.000Z',
    approval: null,
    execution: null,
  },
];

describe('Module 21 — Ticket & Approval UI Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useOrganizationStore.getState().setActiveOrganization({
      id: 'org-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
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

    vi.spyOn(ticketService, 'listTickets').mockResolvedValue({
      tickets: mockTickets,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      },
    });

    vi.spyOn(ticketService, 'getSummaryMetrics').mockResolvedValue({
      open: 1,
      in_progress: 1,
      waiting_on_customer: 0,
      resolved: 0,
      closed: 0,
      total: 2,
    });

    vi.spyOn(ticketService, 'getTicketDetails').mockResolvedValue(mockTickets[0]);
    vi.spyOn(ticketService, 'listComments').mockResolvedValue([]);
    vi.spyOn(ticketService, 'listActivity').mockResolvedValue([]);
    vi.spyOn(ticketService, 'updateStatus').mockResolvedValue({
      ...mockTickets[0],
      status: 'in_progress',
    });

    vi.spyOn(agentApprovalService, 'listProposals').mockResolvedValue({
      items: mockProposals,
      total: 1,
      page: 1,
      limit: 20,
    });

    vi.spyOn(agentApprovalService, 'getProposalDetails').mockResolvedValue(mockProposals[0]);
    vi.spyOn(agentApprovalService, 'approveProposal').mockResolvedValue({
      ...mockProposals[0],
      status: 'approved',
      approval: {
        id: 'appr-1',
        proposalId: 'prop-101',
        organizationId: 'org-1',
        decision: 'approved',
        decidedBy: 'user-admin',
        deciderName: 'Lead SRE',
        decisionReason: 'Verified runbook criteria',
        decidedAt: '2026-11-04T10:05:00.000Z',
      },
    });
    vi.spyOn(agentApprovalService, 'rejectProposal').mockResolvedValue({
      ...mockProposals[0],
      status: 'rejected',
      approval: {
        id: 'appr-2',
        proposalId: 'prop-101',
        organizationId: 'org-1',
        decision: 'rejected',
        decidedBy: 'user-admin',
        decisionReason: 'Wait for verification',
        decidedAt: '2026-11-04T10:05:00.000Z',
      },
    });
  });

  const renderComponent = (initialEntry: string) =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/organizations/:organizationId/tickets" element={<TicketsPage />} />
            <Route
              path="/organizations/:organizationId/tickets/:ticketId"
              element={<TicketDetailsPage />}
            />
            <Route path="/organizations/:organizationId/approvals" element={<ApprovalsPage />} />
            <Route
              path="/organizations/:organizationId/approvals/:approvalId"
              element={<ApprovalDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders ticket list with formatted ticket numbers, priority badges, and status counts', async () => {
    renderComponent('/organizations/org-1/tickets');

    await waitFor(() => {
      expect(screen.getByText('Production API Gateway 502 Outage')).toBeInTheDocument();
      expect(screen.getByText('TICK-000101')).toBeInTheDocument();
      expect(screen.getByText('Request for staging database credentials')).toBeInTheDocument();
    });

    expect(screen.getByText(/Support Tickets/i)).toBeInTheDocument();
  });

  it('renders ticket details page with related AI Action Proposals and status transition controls', async () => {
    renderComponent('/organizations/org-1/tickets/ticket-1');

    await waitFor(() => {
      expect(screen.getByText('Production API Gateway 502 Outage')).toBeInTheDocument();
      expect(screen.getByText('TICK-000101')).toBeInTheDocument();
    });

    // Verify AI Action Proposal card linked to this ticket is displayed
    await waitFor(() => {
      expect(screen.getByText(/AI Action Proposals & Approvals/i)).toBeInTheDocument();
      expect(screen.getByText(/UPDATE TICKET PRIORITY/i)).toBeInTheDocument();
    });

    // Verify comment tabs are present
    expect(screen.getByText(/Conversation & Notes/i)).toBeInTheDocument();
  });

  it('renders Approval Inbox with pending proposals, risk badges, and tool names', async () => {
    renderComponent('/organizations/org-1/approvals');

    await waitFor(() => {
      expect(screen.getByText(/Agent Operational Approvals/i)).toBeInTheDocument();
      expect(screen.getByText(/UPDATE TICKET PRIORITY/i)).toBeInTheDocument();
      expect(screen.getByText(/tool: tickets_update_priority/i)).toBeInTheDocument();
    });
  });

  it('renders ApprovalDetailPage with breadcrumb, parameter diff, and executes approve action', async () => {
    renderComponent('/organizations/org-1/approvals/prop-101');

    await waitFor(() => {
      expect(screen.getByText(/UPDATE TICKET PRIORITY/i)).toBeInTheDocument();
      expect(screen.getByText(/Target Resource: Support Ticket/i)).toBeInTheDocument();
    });

    // Verify diff viewer
    expect(screen.getByText(/Proposed Action Payload Inspection/i)).toBeInTheDocument();

    // Trigger approve action
    const approveButton = screen.getByRole('button', { name: /Approve Action/i });
    fireEvent.click(approveButton);

    // Confirm dialog appears
    await waitFor(() => {
      expect(screen.getByText(/Approve Operational Action/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /Confirm Approval & Execute/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(agentApprovalService.approveProposal).toHaveBeenCalledWith(
        'org-1',
        'prop-101',
        undefined
      );
    });
  });
});
