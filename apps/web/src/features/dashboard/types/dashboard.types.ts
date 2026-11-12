export type DashboardPeriodKey = '7d' | '30d' | '90d' | 'custom';

export interface DashboardDateRange {
  key: DashboardPeriodKey;
  fromDate: string;
  toDate: string;
}

export interface DashboardKPIs {
  openTickets: number;
  unassignedTickets: number;
  urgentTickets: number;
  pendingApprovals: number;
  activeDocuments: number;
  aiWorkflowsTotal: number;
  aiSuccessRate: number;
  avgWorkflowDurationMs: number;
}

export interface TicketStatusDistribution {
  open: number;
  in_progress: number;
  waiting_on_customer: number;
  resolved: number;
  closed: number;
}

export interface TicketPriorityDistribution {
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

export interface TicketTrendPoint {
  date: string;
  created: number;
  resolved: number;
}

export interface DashboardRecentTicket {
  id: string;
  ticketNumber: number;
  formattedTicketNumber: string;
  subject: string;
  priority: string;
  status: string;
  creatorName: string;
  assigneeName: string | null;
  createdAt: string;
}

export interface TicketDashboardMetrics {
  total: number;
  statusDistribution: TicketStatusDistribution;
  priorityDistribution: TicketPriorityDistribution;
  volumeTrend: TicketTrendPoint[];
  recentTickets: DashboardRecentTicket[];
}

export interface DocumentDashboardMetrics {
  total: number;
  active: number;
  archived: number;
  processingStatus: {
    pending: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };
  embeddingStatus: {
    pending: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  totalChunks: number;
  embeddedChunks: number;
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

export interface DashboardRecentApproval {
  id: string;
  toolName: string;
  actionType: string;
  riskLevel: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface ApprovalDashboardMetrics {
  pendingCount: number;
  totalProposals: number;
  statusDistribution: {
    awaiting_approval: number;
    approved: number;
    rejected: number;
    executed: number;
    failed: number;
    cancelled: number;
  };
  recentPending: DashboardRecentApproval[];
}

export interface DashboardRecentActivity {
  id: string;
  action: string;
  actorName: string;
  actorEmail: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardOverviewData {
  period: DashboardDateRange;
  kpis: DashboardKPIs;
  tickets: TicketDashboardMetrics;
  documents: DocumentDashboardMetrics;
  aiActivity: WorkflowAnalyticsSummary;
  approvals: ApprovalDashboardMetrics;
  recentActivity: DashboardRecentActivity[];
}
