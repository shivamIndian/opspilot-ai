import { apiClient } from '@/services/api';
import type { ApiResponse } from '@/types';
import type {
  SafeTicket,
  SafeTicketComment,
  SafeTicketActivityLog,
  TicketSummaryMetrics,
  TicketFilterParams,
  CreateTicketInput,
  UpdateTicketInput,
  TicketPriority,
  TicketStatus,
  CommentVisibility,
} from '../types/ticket.types';

export const ticketService = {
  async createTicket(organizationId: string, input: CreateTicketInput): Promise<SafeTicket> {
    const res = await apiClient.post<ApiResponse<{ ticket: SafeTicket }>>(
      `/organizations/${organizationId}/tickets`,
      input
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to create ticket');
    }
    return res.data.data.ticket;
  },

  async listTickets(
    organizationId: string,
    params: TicketFilterParams = {}
  ): Promise<{
    tickets: SafeTicket[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const res = await apiClient.get<
      ApiResponse<{
        tickets: SafeTicket[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>
    >(`/organizations/${organizationId}/tickets`, { params });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to list tickets');
    }
    return res.data.data;
  },

  async getTicketDetails(organizationId: string, ticketId: string): Promise<SafeTicket> {
    const res = await apiClient.get<ApiResponse<{ ticket: SafeTicket }>>(
      `/organizations/${organizationId}/tickets/${ticketId}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch ticket');
    }
    return res.data.data.ticket;
  },

  async updateTicket(
    organizationId: string,
    ticketId: string,
    input: UpdateTicketInput
  ): Promise<SafeTicket> {
    const res = await apiClient.patch<ApiResponse<{ ticket: SafeTicket }>>(
      `/organizations/${organizationId}/tickets/${ticketId}`,
      input
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to update ticket');
    }
    return res.data.data.ticket;
  },

  async assignTicket(
    organizationId: string,
    ticketId: string,
    assignedToUserId: string | null
  ): Promise<SafeTicket> {
    const res = await apiClient.post<ApiResponse<{ ticket: SafeTicket }>>(
      `/organizations/${organizationId}/tickets/${ticketId}/assign`,
      { assignedToUserId }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to assign ticket');
    }
    return res.data.data.ticket;
  },

  async updatePriority(
    organizationId: string,
    ticketId: string,
    priority: TicketPriority
  ): Promise<SafeTicket> {
    const res = await apiClient.patch<ApiResponse<{ ticket: SafeTicket }>>(
      `/organizations/${organizationId}/tickets/${ticketId}/priority`,
      { priority }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to update priority');
    }
    return res.data.data.ticket;
  },

  async updateStatus(
    organizationId: string,
    ticketId: string,
    status: TicketStatus
  ): Promise<SafeTicket> {
    const res = await apiClient.patch<ApiResponse<{ ticket: SafeTicket }>>(
      `/organizations/${organizationId}/tickets/${ticketId}/status`,
      { status }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to update status');
    }
    return res.data.data.ticket;
  },

  async archiveTicket(organizationId: string, ticketId: string): Promise<SafeTicket> {
    const res = await apiClient.post<ApiResponse<{ ticket: SafeTicket }>>(
      `/organizations/${organizationId}/tickets/${ticketId}/archive`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to archive ticket');
    }
    return res.data.data.ticket;
  },

  async getSummaryMetrics(organizationId: string): Promise<TicketSummaryMetrics> {
    const res = await apiClient.get<ApiResponse<TicketSummaryMetrics>>(
      `/organizations/${organizationId}/tickets/summary`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch metrics');
    }
    return res.data.data;
  },

  async addComment(
    organizationId: string,
    ticketId: string,
    body: string,
    visibility: CommentVisibility = 'public'
  ): Promise<SafeTicketComment> {
    const res = await apiClient.post<ApiResponse<{ comment: SafeTicketComment }>>(
      `/organizations/${organizationId}/tickets/${ticketId}/comments`,
      { body, visibility }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to add comment');
    }
    return res.data.data.comment;
  },

  async listComments(
    organizationId: string,
    ticketId: string,
    limit = 50,
    offset = 0
  ): Promise<{ comments: SafeTicketComment[]; total: number }> {
    const res = await apiClient.get<ApiResponse<{ comments: SafeTicketComment[]; total: number }>>(
      `/organizations/${organizationId}/tickets/${ticketId}/comments`,
      {
        params: { limit, offset },
      }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to load comments');
    }
    return res.data.data;
  },

  async listActivity(
    organizationId: string,
    ticketId: string,
    limit = 50,
    offset = 0
  ): Promise<{ activity: SafeTicketActivityLog[]; total: number }> {
    const res = await apiClient.get<
      ApiResponse<{ activity: SafeTicketActivityLog[]; total: number }>
    >(`/organizations/${organizationId}/tickets/${ticketId}/activity`, {
      params: { limit, offset },
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to load activity');
    }
    return res.data.data;
  },
};
