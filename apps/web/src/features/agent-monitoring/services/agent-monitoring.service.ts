import { apiClient } from '@/services/api';
import type { ApiResponse } from '@/types';
import type {
  MonitoringOverview,
  WorkflowRunItem,
  WorkflowRunDetail,
  WorkflowEvent,
  ToolExecutionMetric,
  WorkflowRunsFilter,
} from '../types/agent-monitoring.types';

export const agentMonitoringService = {
  async getOverview(
    organizationId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<MonitoringOverview> {
    const res = await apiClient.get<ApiResponse<MonitoringOverview>>(
      `/organizations/${organizationId}/agent-monitoring/overview`,
      { params: { fromDate, toDate } }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch monitoring overview');
    }
    return res.data.data;
  },

  async listRuns(
    organizationId: string,
    filters: WorkflowRunsFilter = {}
  ): Promise<{
    items: WorkflowRunItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const res = await apiClient.get<
      ApiResponse<{
        items: WorkflowRunItem[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      }>
    >(`/organizations/${organizationId}/agent-monitoring/runs`, {
      params: filters,
    });

    if (!res.data.success || !res.data.data) {
      return {
        items: [],
        total: 0,
        page: filters.page || 1,
        limit: filters.limit || 20,
        totalPages: 1,
      };
    }

    return {
      items: res.data.data.items,
      total: res.data.data.total,
      page: res.data.data.page,
      limit: res.data.data.limit,
      totalPages: res.data.data.total_pages,
    };
  },

  async getRunDetails(organizationId: string, runId: string): Promise<WorkflowRunDetail> {
    const res = await apiClient.get<ApiResponse<WorkflowRunDetail>>(
      `/organizations/${organizationId}/agent-monitoring/runs/${runId}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch workflow run details');
    }
    return res.data.data;
  },

  async getRunEvents(organizationId: string, runId: string): Promise<WorkflowEvent[]> {
    const res = await apiClient.get<ApiResponse<WorkflowEvent[]>>(
      `/organizations/${organizationId}/agent-monitoring/runs/${runId}/events`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch workflow events');
    }
    return res.data.data;
  },

  async getToolExecutions(organizationId: string): Promise<ToolExecutionMetric[]> {
    const res = await apiClient.get<ApiResponse<ToolExecutionMetric[]>>(
      `/organizations/${organizationId}/agent-monitoring/tool-executions`
    );
    if (!res.data.success || !res.data.data) {
      return [];
    }
    return res.data.data;
  },
};
