export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketCategory =
  'technical_support' | 'account_access' | 'bug_report' | 'billing' | 'feature_request' | 'general';

export type CommentVisibility = 'public' | 'internal';

export type TicketAction =
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.assigned'
  | 'ticket.unassigned'
  | 'ticket.priority_changed'
  | 'ticket.status_changed'
  | 'ticket.resolved'
  | 'ticket.closed'
  | 'ticket.reopened'
  | 'ticket.comment_added'
  | 'ticket.archived';

export interface TicketUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface SafeTicket {
  id: string;
  organizationId: string;
  ticketNumber: number;
  formattedTicketNumber: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdByUserId: string;
  assignedToUserId: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: TicketUserSummary;
  assignee?: TicketUserSummary | null;
}

export interface SafeTicketComment {
  id: string;
  organizationId: string;
  ticketId: string;
  authorUserId: string;
  body: string;
  visibility: CommentVisibility;
  createdAt: string;
  updatedAt: string | null;
  author?: TicketUserSummary;
}

export interface SafeTicketActivityLog {
  id: string;
  organizationId: string;
  ticketId: string;
  actorUserId: string | null;
  action: TicketAction;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor?: TicketUserSummary | null;
}

export interface TicketSummaryMetrics {
  total: number;
  open: number;
  inProgress: number;
  waitingOnCustomer: number;
  resolved: number;
  closed: number;
  urgent: number;
  high: number;
}

export interface TicketFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  createdBy?: string;
  sortBy?: 'created_at' | 'updated_at' | 'ticket_number' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  archived?: boolean;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  category?: TicketCategory;
}
