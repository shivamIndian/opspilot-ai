import { aiEvaluationClient } from '../client/ai-evaluation.client.js';
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

export class AiEvaluationService {
  async listDatasets(organizationId: string): Promise<EvaluationDatasetItem[]> {
    return aiEvaluationClient.listDatasets(organizationId);
  }

  async createDataset(
    organizationId: string,
    payload: EvaluationDatasetCreateInput
  ): Promise<EvaluationDatasetItem> {
    return aiEvaluationClient.createDataset(organizationId, payload);
  }

  async getDataset(
    organizationId: string,
    datasetId: string
  ): Promise<{ dataset: EvaluationDatasetItem; examples: EvaluationExampleItem[] }> {
    return aiEvaluationClient.getDataset(organizationId, datasetId);
  }

  async addExamples(
    organizationId: string,
    datasetId: string,
    examples: EvaluationExampleInput[]
  ): Promise<EvaluationExampleItem[]> {
    return aiEvaluationClient.addExamples(organizationId, datasetId, examples);
  }

  async startRun(
    organizationId: string,
    payload: EvaluationRunCreateInput
  ): Promise<EvaluationRunItem> {
    return aiEvaluationClient.startRun(organizationId, payload);
  }

  async listRuns(organizationId: string): Promise<EvaluationRunItem[]> {
    return aiEvaluationClient.listRuns(organizationId);
  }

  async getRun(organizationId: string, runId: string): Promise<EvaluationRunItem> {
    return aiEvaluationClient.getRun(organizationId, runId);
  }

  async getRunResults(
    organizationId: string,
    runId: string
  ): Promise<EvaluationRunResultItem[]> {
    return aiEvaluationClient.getRunResults(organizationId, runId);
  }

  async compareRuns(
    organizationId: string,
    runIdA: string,
    runIdB: string
  ): Promise<EvaluationComparisonResult> {
    return aiEvaluationClient.compareRuns(organizationId, runIdA, runIdB);
  }
}

export const aiEvaluationService = new AiEvaluationService();
