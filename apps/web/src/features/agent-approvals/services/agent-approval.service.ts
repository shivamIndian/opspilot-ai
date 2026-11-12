import { apiClient } from '@/services/api';
import type { ApiResponse } from '@/types';
import type {
  SafeAgentProposal,
  ApprovalFilterParams,
} from '../types/agent-approvals.types';

export const agentApprovalService = {
  async listProposals(
    organizationId: string,
    params: ApprovalFilterParams = {}
  ): Promise<{
    items: SafeAgentProposal[];
    total: number;
    page: number;
    limit: number;
  }> {
    const res = await apiClient.get<
      ApiResponse<SafeAgentProposal[]> & {
        pagination?: { total: number; page: number; limit: number };
      }
    >(`/organizations/${organizationId}/agent/approvals`, { params });

    return {
      items: res.data.data || [],
      total: res.data.pagination?.total || (res.data.data ? res.data.data.length : 0),
      page: res.data.pagination?.page || 1,
      limit: res.data.pagination?.limit || 20,
    };
  },

  async getProposalDetails(
    organizationId: string,
    proposalId: string
  ): Promise<SafeAgentProposal> {
    const res = await apiClient.get<ApiResponse<SafeAgentProposal>>(
      `/organizations/${organizationId}/agent/approvals/${proposalId}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch proposal details');
    }
    return res.data.data;
  },

  async approveProposal(
    organizationId: string,
    proposalId: string,
    notes?: string
  ): Promise<SafeAgentProposal> {
    const res = await apiClient.post<ApiResponse<SafeAgentProposal>>(
      `/organizations/${organizationId}/agent/approvals/${proposalId}/approve`,
      { notes }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to approve proposal');
    }
    return res.data.data;
  },

  async rejectProposal(
    organizationId: string,
    proposalId: string,
    reason: string
  ): Promise<SafeAgentProposal> {
    const res = await apiClient.post<ApiResponse<SafeAgentProposal>>(
      `/organizations/${organizationId}/agent/approvals/${proposalId}/reject`,
      { reason }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to reject proposal');
    }
    return res.data.data;
  },

  async cancelProposal(
    organizationId: string,
    proposalId: string,
    reason?: string
  ): Promise<SafeAgentProposal> {
    const res = await apiClient.post<ApiResponse<SafeAgentProposal>>(
      `/organizations/${organizationId}/agent/approvals/${proposalId}/cancel`,
      { reason }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to cancel proposal');
    }
    return res.data.data;
  },
};
