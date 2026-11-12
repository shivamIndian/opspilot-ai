import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiEvaluationService } from '../services/ai-evaluation.service';
import type { EvaluationCategory } from '../types/ai-evaluation.types';

export const useEvaluationDatasets = (organizationId?: string) => {
  return useQuery({
    queryKey: ['ai-evaluation', 'datasets', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return aiEvaluationService.listDatasets(organizationId);
    },
    enabled: !!organizationId,
  });
};

export const useEvaluationDatasetDetails = (organizationId?: string, datasetId?: string) => {
  return useQuery({
    queryKey: ['ai-evaluation', 'dataset-details', organizationId, datasetId],
    queryFn: () => {
      if (!organizationId || !datasetId) throw new Error('Missing ID');
      return aiEvaluationService.getDatasetDetails(organizationId, datasetId);
    },
    enabled: !!organizationId && !!datasetId,
  });
};

export const useEvaluationRuns = (organizationId?: string) => {
  return useQuery({
    queryKey: ['ai-evaluation', 'runs', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return aiEvaluationService.listRuns(organizationId);
    },
    enabled: !!organizationId,
  });
};

export const useEvaluationRunDetails = (organizationId?: string, runId?: string) => {
  return useQuery({
    queryKey: ['ai-evaluation', 'run-details', organizationId, runId],
    queryFn: () => {
      if (!organizationId || !runId) throw new Error('Missing ID');
      return aiEvaluationService.getRunDetails(organizationId, runId);
    },
    enabled: !!organizationId && !!runId,
  });
};

export const useEvaluationRunResults = (organizationId?: string, runId?: string) => {
  return useQuery({
    queryKey: ['ai-evaluation', 'run-results', organizationId, runId],
    queryFn: () => {
      if (!organizationId || !runId) throw new Error('Missing ID');
      return aiEvaluationService.getRunResults(organizationId, runId);
    },
    enabled: !!organizationId && !!runId,
  });
};

export const useRunComparison = (
  organizationId?: string,
  runIdA?: string,
  runIdB?: string
) => {
  return useQuery({
    queryKey: ['ai-evaluation', 'compare', organizationId, runIdA, runIdB],
    queryFn: () => {
      if (!organizationId || !runIdA || !runIdB) throw new Error('Missing comparison params');
      return aiEvaluationService.compareRuns(organizationId, runIdA, runIdB);
    },
    enabled: !!organizationId && !!runIdA && !!runIdB,
  });
};

export const useCreateDataset = (organizationId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; category: EvaluationCategory }) => {
      if (!organizationId) throw new Error('Organization ID is required');
      return aiEvaluationService.createDataset(organizationId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-evaluation', 'datasets', organizationId] });
    },
  });
};

export const useStartEvaluationRun = (organizationId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      datasetId: string;
      modelProvider?: string;
      modelName?: string;
      evaluatorMode?: 'deterministic' | 'model_judge' | 'hybrid';
    }) => {
      if (!organizationId) throw new Error('Organization ID is required');
      return aiEvaluationService.startRun(organizationId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-evaluation', 'runs', organizationId] });
    },
  });
};
