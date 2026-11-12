import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Target,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useEvaluationRunDetails,
  useEvaluationRunResults,
} from '../hooks/useAiEvaluation';
import type { EvaluationRunResult } from '../types/ai-evaluation.types';

export const EvaluationRunDetailPage: React.FC = () => {
  const { organizationId, runId } = useParams<{
    organizationId: string;
    runId: string;
  }>();

  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed'>('all');
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});

  const {
    data: run,
    isLoading: isRunLoading,
    error: runError,
  } = useEvaluationRunDetails(organizationId, runId);

  const {
    data: results,
    isLoading: isResultsLoading,
    error: resultsError,
  } = useEvaluationRunResults(organizationId, runId);

  const toggleExpand = (id: string) => {
    setExpandedResults((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (isRunLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
        <p className="text-xs text-slate-500 animate-pulse">
          Loading evaluation benchmark telemetry...
        </p>
      </div>
    );
  }

  if (runError || !run) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200">
          <h3 className="font-bold text-sm">Failed to load evaluation run</h3>
          <p className="text-xs mt-1">
            {runError instanceof Error ? runError.message : 'Evaluation run record not found'}
          </p>
        </div>
        <Link
          to={`/organizations/${organizationId}/ai-evaluation`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Return to AI Evaluation Control Plane
        </Link>
      </div>
    );
  }

  const filteredResults = (results || []).filter((r: EvaluationRunResult) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> {status}
          </span>
        );
      case 'running':
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 animate-pulse">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  const metrics = run.summary_metrics || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link
          to={`/organizations/${organizationId}/ai-evaluation`}
          className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> AI Evaluation
        </Link>
        <span>/</span>
        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
          Run {run.id}
        </span>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(run.status)}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                <Sparkles className="w-3 h-3" /> {run.category.replace(/_/g, ' ')}
              </span>
              {run.rubric_version && (
                <span className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  Rubric: {run.rubric_version}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {run.dataset_name || 'Benchmark Evaluation Run'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Run ID: {run.id} | Dataset v{run.dataset_version} ({run.dataset_id})
            </p>
          </div>

          <div className="text-left md:text-right text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Evaluated Model: </span>
              <span className="font-mono text-purple-600 dark:text-purple-400 font-medium">
                {run.model_provider || 'system'} / {run.model_name || 'default'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Executed: </span>
              {new Date(run.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Overall Benchmark Score
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {typeof metrics.overall_score === 'number' ? (
                <span className="text-purple-600 dark:text-purple-400">{metrics.overall_score}%</span>
              ) : (
                '—'
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Test Samples Executed
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {run.completed_examples} / {run.total_examples}
              {run.failed_examples > 0 && (
                <span className="text-xs text-red-500 font-normal ml-1">
                  ({run.failed_examples} failed)
                </span>
              )}
            </div>
          </div>

          {metrics.mean_reciprocal_rank !== undefined && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Mean Reciprocal Rank (MRR)
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
                {Number(metrics.mean_reciprocal_rank).toFixed(3)}
              </div>
            </div>
          )}

          {metrics.citation_accuracy !== undefined && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Citation Grounding
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {(Number(metrics.citation_accuracy) * 100).toFixed(1)}%
              </div>
            </div>
          )}

          {metrics.tool_accuracy !== undefined && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Tool Selection Accuracy
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {(Number(metrics.tool_accuracy) * 100).toFixed(1)}%
              </div>
            </div>
          )}

          {metrics.model_judge_pass_rate !== undefined && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Judge Pass Rate
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {(Number(metrics.model_judge_pass_rate) * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Sample Evaluation Details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Evaluation Benchmark Results & Trace Records
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inspect test case prompts, outputs, automated scoring rubrics, and judge feedback.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter:</span>
            <select
              aria-label="Filter results by status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'success' | 'failed')}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="all">All Results ({(results || []).length})</option>
              <option value="success">Success Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>
        </div>

        {isResultsLoading ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading benchmark test results...</span>
          </div>
        ) : resultsError ? (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
            Failed to retrieve sample results: {resultsError instanceof Error ? resultsError.message : 'Unknown error'}
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-xs">No sample records found matching current criteria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((result: EvaluationRunResult, idx: number) => {
              const isExpanded = !!expandedResults[result.id];
              return (
                <div
                  key={result.id || idx}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900/60"
                >
                  <div
                    onClick={() => toggleExpand(result.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      {getStatusBadge(result.status)}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {result.query}
                        </p>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Sample ID: {result.example_id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {result.model_judge_score !== null && result.model_judge_score !== undefined && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                          Judge: {result.model_judge_score}/5
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-3 text-xs">
                      {/* Query Details */}
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Test Input Query:
                        </span>
                        <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                          {result.query}
                        </div>
                      </div>

                      {/* Actual Output */}
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Model Generated Output:
                        </span>
                        <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-[11px] max-h-48 overflow-y-auto">
                          {result.output || '<No output recorded>'}
                        </div>
                      </div>

                      {/* Metrics breakdown */}
                      {result.metrics && Object.keys(result.metrics).length > 0 && (
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Sample Metric Scores:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(result.metrics).map(([k, v]) => (
                              <span
                                key={k}
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]"
                              >
                                {k}: {typeof v === 'number' ? v.toFixed(3) : String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Judge Notes */}
                      {result.model_judge_notes && (
                        <div>
                          <span className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1 mb-1">
                            <Target className="w-3.5 h-3.5" /> Judge Feedback & Rubric Reasoning:
                          </span>
                          <div className="p-2.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 text-[11px]">
                            {result.model_judge_notes}
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {result.error_message && (
                        <div>
                          <span className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-1 mb-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Execution Failure:
                          </span>
                          <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-mono text-[11px]">
                            {result.error_message}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
