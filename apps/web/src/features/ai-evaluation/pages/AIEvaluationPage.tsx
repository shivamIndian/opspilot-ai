import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, RefreshCw, AlertCircle, Database, Gauge, GitCompare } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import {
  useEvaluationDatasets,
  useEvaluationRuns,
  useCreateDataset,
  useStartEvaluationRun,
  useRunComparison,
} from '../hooks/useAiEvaluation';
import { EvaluationOverviewCards } from '../components/EvaluationOverviewCards';
import { EvaluationDatasetsTable } from '../components/EvaluationDatasetsTable';
import { EvaluationRunsTable } from '../components/EvaluationRunsTable';
import { RunComparisonView } from '../components/RunComparisonView';
import type { EvaluationDataset, EvaluationCategory } from '../types/ai-evaluation.types';

export const AIEvaluationPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { activeOrganization } = useOrganizations();
  const currentOrgId = organizationId || activeOrganization?.id;

  const [activeTab, setActiveTab] = useState<'datasets' | 'runs' | 'compare'>('datasets');
  const [selectedRunA, setSelectedRunA] = useState<string | undefined>();
  const [selectedRunB, setSelectedRunB] = useState<string | undefined>();

  const {
    data: datasets,
    isLoading: isDatasetsLoading,
    refetch: refetchDatasets,
  } = useEvaluationDatasets(currentOrgId);

  const {
    data: runs,
    isLoading: isRunsLoading,
    refetch: refetchRuns,
  } = useEvaluationRuns(currentOrgId);

  const createDatasetMutation = useCreateDataset(currentOrgId);
  const startRunMutation = useStartEvaluationRun(currentOrgId);

  const { data: comparisonData, isLoading: isComparisonLoading } = useRunComparison(
    currentOrgId,
    selectedRunA,
    selectedRunB
  );

  const handleRefresh = async () => {
    await Promise.all([refetchDatasets(), refetchRuns()]);
  };

  const handleCreateDataset = async (data: {
    name: string;
    description?: string;
    category: EvaluationCategory;
  }) => {
    await createDatasetMutation.mutateAsync(data);
  };

  const handleRunBenchmark = async (dataset: EvaluationDataset) => {
    await startRunMutation.mutateAsync({
      datasetId: dataset.id,
      modelProvider: 'mock',
      modelName: 'mock-evaluator',
      evaluatorMode: 'hybrid',
    });
    setActiveTab('runs');
  };

  const handleCompare = (runIdA: string, runIdB: string) => {
    setSelectedRunA(runIdA);
    setSelectedRunB(runIdB);
  };

  if (!currentOrgId) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        Please select an active organization to access the AI Evaluation Control Plane.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            AI Quality Evaluation & Benchmark Control Plane
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Measure RAG retrieval accuracy, model grounding, tool selection correctness, and prompt regression against versioned test collections.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 self-start md:self-auto"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isDatasetsLoading || isRunsLoading ? 'animate-spin' : ''}`}
          />
          Refresh Benchmarks
        </button>
      </div>

      {/* Overview KPI Cards */}
      <EvaluationOverviewCards
        datasets={datasets || []}
        runs={runs || []}
        isLoading={isDatasetsLoading || isRunsLoading}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('datasets')}
          className={`flex items-center gap-2 pb-3 px-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'datasets'
              ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" /> Benchmark Datasets ({datasets?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('runs')}
          className={`flex items-center gap-2 pb-3 px-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'runs'
              ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Gauge className="w-4 h-4" /> Benchmark Executions ({runs?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('compare')}
          className={`flex items-center gap-2 pb-3 px-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'compare'
              ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <GitCompare className="w-4 h-4" /> Run Comparison & Regression
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'datasets' && (
        <EvaluationDatasetsTable
          datasets={datasets || []}
          isLoading={isDatasetsLoading}
          onCreateDataset={handleCreateDataset}
          onRunBenchmark={handleRunBenchmark}
          isRunningBenchmark={startRunMutation.isPending}
        />
      )}

      {activeTab === 'runs' && (
        <EvaluationRunsTable
          runs={runs || []}
          organizationId={currentOrgId}
          isLoading={isRunsLoading}
        />
      )}

      {activeTab === 'compare' && (
        <RunComparisonView
          runs={runs || []}
          comparison={comparisonData}
          isLoading={isComparisonLoading}
          onCompare={handleCompare}
        />
      )}
    </div>
  );
};
