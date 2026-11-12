import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import type {
  EvaluationDatasetItem,
  EvaluationDatasetCreateInput,
  EvaluationExampleInput,
  EvaluationExampleItem,
  EvaluationRunCreateInput,
  EvaluationRunItem,
  EvaluationRunResultItem,
  EvaluationComparisonResult,
} from '../types/ai-evaluation.types.js';

export class AiEvaluationClientError extends Error {
  constructor(
    message: string,
    public errorCode: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AiEvaluationClientError';
  }
}

export class AiEvaluationClient {
  private baseUrl: string;
  private internalToken: string;

  constructor(
    aiServiceUrl: string = config.AI_SERVICE_URL,
    internalToken: string = config.AI_SERVICE_INTERNAL_TOKEN
  ) {
    this.baseUrl = aiServiceUrl.replace(/\/+$/, '');
    this.internalToken = internalToken;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    const searchParams = new URLSearchParams(params);
    const targetUrl = `${this.baseUrl}${endpoint}${params ? '?' + searchParams.toString() : ''}`;

    try {
      const response = await fetch(targetUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': this.internalToken,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMsg =
          errorBody?.detail?.message ||
          errorBody?.message ||
          `AI Evaluation service returned status ${response.status}`;
        const errorCode = errorBody?.detail?.code || 'AI_EVALUATION_ERROR';

        throw new AiEvaluationClientError(errorMsg, errorCode, response.status, errorBody);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof AiEvaluationClientError) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Failed to connect to AI Evaluation service';
      logger.error(`[AiEvaluationClient] Request error: ${message}`);
      throw new AiEvaluationClientError(message, 'AI_EVALUATION_SERVICE_UNAVAILABLE', 503);
    }
  }

  async listDatasets(organizationId: string): Promise<EvaluationDatasetItem[]> {
    return this.request<EvaluationDatasetItem[]>(
      '/internal/v1/evaluation/datasets',
      'GET',
      undefined,
      { organization_id: organizationId }
    );
  }

  async createDataset(
    organizationId: string,
    payload: EvaluationDatasetCreateInput
  ): Promise<EvaluationDatasetItem> {
    return this.request<EvaluationDatasetItem>(
      '/internal/v1/evaluation/datasets',
      'POST',
      payload,
      { organization_id: organizationId }
    );
  }

  async getDataset(
    organizationId: string,
    datasetId: string
  ): Promise<{ dataset: EvaluationDatasetItem; examples: EvaluationExampleItem[] }> {
    return this.request<{ dataset: EvaluationDatasetItem; examples: EvaluationExampleItem[] }>(
      `/internal/v1/evaluation/datasets/${encodeURIComponent(datasetId)}`,
      'GET',
      undefined,
      { organization_id: organizationId }
    );
  }

  async addExamples(
    organizationId: string,
    datasetId: string,
    examples: EvaluationExampleInput[]
  ): Promise<EvaluationExampleItem[]> {
    return this.request<EvaluationExampleItem[]>(
      `/internal/v1/evaluation/datasets/${encodeURIComponent(datasetId)}/examples`,
      'POST',
      examples,
      { organization_id: organizationId }
    );
  }

  async startRun(
    organizationId: string,
    payload: EvaluationRunCreateInput
  ): Promise<EvaluationRunItem> {
    return this.request<EvaluationRunItem>(
      '/internal/v1/evaluation/runs',
      'POST',
      {
        dataset_id: payload.datasetId,
        model_provider: payload.modelProvider || 'mock',
        model_name: payload.modelName || 'mock-evaluator',
        evaluator_mode: payload.evaluatorMode || 'hybrid',
      },
      { organization_id: organizationId }
    );
  }

  async listRuns(organizationId: string): Promise<EvaluationRunItem[]> {
    return this.request<EvaluationRunItem[]>(
      '/internal/v1/evaluation/runs',
      'GET',
      undefined,
      { organization_id: organizationId }
    );
  }

  async getRun(organizationId: string, runId: string): Promise<EvaluationRunItem> {
    return this.request<EvaluationRunItem>(
      `/internal/v1/evaluation/runs/${encodeURIComponent(runId)}`,
      'GET',
      undefined,
      { organization_id: organizationId }
    );
  }

  async getRunResults(
    organizationId: string,
    runId: string
  ): Promise<EvaluationRunResultItem[]> {
    return this.request<EvaluationRunResultItem[]>(
      `/internal/v1/evaluation/runs/${encodeURIComponent(runId)}/results`,
      'GET',
      undefined,
      { organization_id: organizationId }
    );
  }

  async compareRuns(
    organizationId: string,
    runIdA: string,
    runIdB: string
  ): Promise<EvaluationComparisonResult> {
    return this.request<EvaluationComparisonResult>(
      '/internal/v1/evaluation/compare',
      'GET',
      undefined,
      {
        organization_id: organizationId,
        run_id_a: runIdA,
        run_id_b: runIdB,
      }
    );
  }
}

export const aiEvaluationClient = new AiEvaluationClient();
