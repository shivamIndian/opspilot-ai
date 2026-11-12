import { apiClient } from './api';
import type { ApiResponse } from '@/types';
import type {
  SafeOrganization,
  OrganizationMember,
  OrganizationInvitation,
} from '@/types/organization';

export const organizationService = {
  async listOrganizations(): Promise<SafeOrganization[]> {
    const res =
      await apiClient.get<ApiResponse<{ organizations: SafeOrganization[] }>>('/organizations');
    return res.data.data?.organizations || [];
  },

  async getOrganization(organizationId: string): Promise<SafeOrganization> {
    const res = await apiClient.get<ApiResponse<{ organization: SafeOrganization }>>(
      `/organizations/${organizationId}`
    );
    if (!res.data.data?.organization) {
      throw new Error(res.data.error?.message || 'Failed to fetch organization');
    }
    return res.data.data.organization;
  },

  async createOrganization(data: {
    name: string;
    slug?: string;
    description?: string;
  }): Promise<SafeOrganization> {
    const res = await apiClient.post<ApiResponse<{ organization: SafeOrganization }>>(
      '/organizations',
      data
    );
    if (!res.data.data?.organization) {
      throw new Error(res.data.error?.message || 'Failed to create organization');
    }
    return res.data.data.organization;
  },

  async updateOrganization(
    organizationId: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      logo_url?: string | null;
    }
  ): Promise<SafeOrganization> {
    const res = await apiClient.patch<ApiResponse<{ organization: SafeOrganization }>>(
      `/organizations/${organizationId}`,
      data
    );
    if (!res.data.data?.organization) {
      throw new Error(res.data.error?.message || 'Failed to update organization');
    }
    return res.data.data.organization;
  },

  async archiveOrganization(organizationId: string): Promise<void> {
    await apiClient.post(`/organizations/${organizationId}/archive`);
  },

  async listMembers(
    organizationId: string,
    params?: {
      search?: string;
      role?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    members: OrganizationMember[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const res = await apiClient.get<
      ApiResponse<{
        members: OrganizationMember[];
        total: number;
        limit: number;
        offset: number;
      }>
    >(`/organizations/${organizationId}/members`, { params });
    return (
      res.data.data || {
        members: [],
        total: 0,
        limit: 20,
        offset: 0,
      }
    );
  },

  async updateMemberRole(
    organizationId: string,
    memberId: string,
    role: 'admin' | 'member'
  ): Promise<OrganizationMember> {
    const res = await apiClient.patch<ApiResponse<{ member: OrganizationMember }>>(
      `/organizations/${organizationId}/members/${memberId}/role`,
      { role }
    );
    if (!res.data.data?.member) {
      throw new Error(res.data.error?.message || 'Failed to update member role');
    }
    return res.data.data.member;
  },

  async removeMember(organizationId: string, memberId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/members/${memberId}`);
  },

  async leaveOrganization(organizationId: string): Promise<void> {
    await apiClient.post(`/organizations/${organizationId}/leave`);
  },

  async transferOwnership(
    organizationId: string,
    newOwnerUserId: string
  ): Promise<{ message: string }> {
    const res = await apiClient.post<ApiResponse>(
      `/organizations/${organizationId}/transfer-ownership`,
      { newOwnerUserId }
    );
    return { message: res.data.message || 'Ownership transferred' };
  },

  async listInvitations(
    organizationId: string,
    params?: { status?: string; limit?: number; offset?: number }
  ): Promise<{
    invitations: OrganizationInvitation[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const res = await apiClient.get<
      ApiResponse<{
        invitations: OrganizationInvitation[];
        total: number;
        limit: number;
        offset: number;
      }>
    >(`/organizations/${organizationId}/invitations`, { params });
    return (
      res.data.data || {
        invitations: [],
        total: 0,
        limit: 20,
        offset: 0,
      }
    );
  },

  async createInvitation(
    organizationId: string,
    data: { email: string; role: 'admin' | 'member' }
  ): Promise<OrganizationInvitation> {
    const res = await apiClient.post<ApiResponse<{ invitation: OrganizationInvitation }>>(
      `/organizations/${organizationId}/invitations`,
      data
    );
    if (!res.data.data?.invitation) {
      throw new Error(res.data.error?.message || 'Failed to send invitation');
    }
    return res.data.data.invitation;
  },

  async resendInvitation(organizationId: string, invitationId: string): Promise<void> {
    await apiClient.post(`/organizations/${organizationId}/invitations/${invitationId}/resend`);
  },

  async revokeInvitation(organizationId: string, invitationId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/invitations/${invitationId}`);
  },

  async acceptInvitation(token: string): Promise<{ organization: SafeOrganization; role: string }> {
    const res = await apiClient.post<ApiResponse<{ organization: SafeOrganization; role: string }>>(
      '/invitations/accept',
      { token }
    );
    if (!res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to accept invitation');
    }
    return res.data.data;
  },
};
