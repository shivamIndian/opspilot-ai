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

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface TicketEntity {
  id: string;
  organization_id: string;
  ticket_number: string | number;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_by_user_id: string;
  assigned_to_user_id: string | null;
  resolved_at: Date | null;
  closed_at: Date | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TicketWithUsersEntity extends TicketEntity {
  creator_name?: string;
  creator_email?: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
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
  creator?: UserSummary;
  assignee?: UserSummary | null;
}

export interface TicketCommentEntity {
  id: string;
  organization_id: string;
  ticket_id: string;
  author_user_id: string;
  body: string;
  visibility: CommentVisibility;
  created_at: Date;
  updated_at: Date | null;
}

export interface TicketCommentWithAuthorEntity extends TicketCommentEntity {
  author_name?: string;
  author_email?: string;
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
  author?: UserSummary;
}

export interface TicketActivityLogEntity {
  id: string;
  organization_id: string;
  ticket_id: string;
  actor_user_id: string | null;
  action: TicketAction;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface TicketActivityLogWithActorEntity extends TicketActivityLogEntity {
  actor_name?: string | null;
  actor_email?: string | null;
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
  actor?: UserSummary | null;
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
