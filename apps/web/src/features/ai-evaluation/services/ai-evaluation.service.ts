import { apiClient } from '@/services/api';
import type { ApiResponse } from '@/types';
import type {
  EvaluationDataset,
  EvaluationExample,
  EvaluationRun,
  EvaluationRunResult,
  EvaluationComparison,
  EvaluationCategory,
} from '../types/ai-evaluation.types';

export const aiEvaluationService = {
  async listDatasets(organizationId: string): Promise<EvaluationDataset[]> {
    const res = await apiClient.get<ApiResponse<EvaluationDataset[]>>(
      `/organizations/${organizationId}/ai-evaluation/datasets`
    );
    if (!res.data.success || !res.data.data) {
      return [];
    }
    return res.data.data;
  },

  async createDataset(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      category: EvaluationCategory;
    }
  ): Promise<EvaluationDataset> {
    const res = await apiClient.post<ApiResponse<EvaluationDataset>>(
      `/organizations/${organizationId}/ai-evaluation/datasets`,
      data
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to create evaluation dataset');
    }
    return res.data.data;
  },

  async getDatasetDetails(
    organizationId: string,
    datasetId: string
  ): Promise<{ dataset: EvaluationDataset; examples: EvaluationExample[] }> {
    const res = await apiClient.get<
      ApiResponse<{ dataset: EvaluationDataset; examples: EvaluationExample[] }>
    >(`/organizations/${organizationId}/ai-evaluation/datasets/${datasetId}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch dataset details');
    }
    return res.data.data;
  },

  async startRun(
    organizationId: string,
    data: {
      datasetId: string;
      modelProvider?: string;
      modelName?: string;
      evaluatorMode?: 'deterministic' | 'model_judge' | 'hybrid';
    }
  ): Promise<EvaluationRun> {
    const res = await apiClient.post<ApiResponse<EvaluationRun>>(
      `/organizations/${organizationId}/ai-evaluation/runs`,
      data
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to start evaluation run');
    }
    return res.data.data;
  },

  async listRuns(organizationId: string): Promise<EvaluationRun[]> {
    const res = await apiClient.get<ApiResponse<EvaluationRun[]>>(
      `/organizations/${organizationId}/ai-evaluation/runs`
    );
    if (!res.data.success || !res.data.data) {
      return [];
    }
    return res.data.data;
  },

  async getRunDetails(organizationId: string, runId: string): Promise<EvaluationRun> {
    const res = await apiClient.get<ApiResponse<EvaluationRun>>(
      `/organizations/${organizationId}/ai-evaluation/runs/${runId}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch run details');
    }
    return res.data.data;
  },

  async getRunResults(
    organizationId: string,
    runId: string
  ): Promise<EvaluationRunResult[]> {
    const res = await apiClient.get<ApiResponse<EvaluationRunResult[]>>(
      `/organizations/${organizationId}/ai-evaluation/runs/${runId}/results`
    );
    if (!res.data.success || !res.data.data) {
      return [];
    }
    return res.data.data;
  },

  async compareRuns(
    organizationId: string,
    runIdA: string,
    runIdB: string
  ): Promise<EvaluationComparison> {
    const res = await apiClient.get<ApiResponse<EvaluationComparison>>(
      `/organizations/${organizationId}/ai-evaluation/compare`,
      { params: { runIdA, runIdB } }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to compare evaluation runs');
    }
    return res.data.data;
  },
};
