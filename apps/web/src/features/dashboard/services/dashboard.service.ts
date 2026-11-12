import { apiClient } from '@/services/api';
import type { DashboardOverviewData, DashboardRecentActivity } from '../types/dashboard.types';

export const dashboardService = {
  async getOverview(organizationId: string, period: string = '30d'): Promise<DashboardOverviewData> {
    const response = await apiClient.get<{ success: boolean; data: DashboardOverviewData }>(
      `/organizations/${organizationId}/dashboard/overview`,
      { params: { period } }
    );
    return response.data.data;
  },

  async getRecentActivity(
    organizationId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ items: DashboardRecentActivity[]; limit: number; offset: number }> {
    const response = await apiClient.get<{
      success: boolean;
      data: { items: DashboardRecentActivity[]; limit: number; offset: number };
    }>(`/organizations/${organizationId}/dashboard/recent-activity`, {
      params: { limit, offset },
    });
    return response.data.data;
  },
};
