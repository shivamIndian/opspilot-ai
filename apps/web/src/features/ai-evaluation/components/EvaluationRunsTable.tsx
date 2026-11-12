import React from 'react';
import { Link } from 'react-router-dom';
import { Gauge, CheckCircle2, Clock, XCircle, ExternalLink, AlertCircle } from 'lucide-react';
import type { EvaluationRun } from '../types/ai-evaluation.types';

interface EvaluationRunsTableProps {
  runs: EvaluationRun[];
  organizationId: string;
  isLoading?: boolean;
}

export const EvaluationRunsTable: React.FC<EvaluationRunsTableProps> = ({
  runs,
  organizationId,
  isLoading,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'running':
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 animate-pulse">
            <Clock className="w-3 h-3" /> Evaluating...
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Evaluation Benchmark Executions & Quality Records
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            History of automated model evaluations, deterministic IR metrics, and test sample outcomes.
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {runs.length} benchmark run(s)
        </span>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <th className="py-3 px-4">Run ID / Dataset</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Model Provider</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Overall Score</th>
              <th className="py-3 px-4">Samples</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading evaluation runs...</span>
                  </div>
                </td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  No evaluation benchmark runs recorded. Execute a benchmark dataset above.
                </td>
              </tr>
            ) : (
              runs.map((r) => {
                const score = r.summary_metrics?.overall_score;
                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {r.id.slice(0, 8)}...
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[200px]">
                        {r.dataset_name || 'Benchmark Dataset'} (v{r.dataset_version})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-slate-700 dark:text-slate-300">
                        {r.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {r.model_provider} / {r.model_name}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {typeof score === 'number' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{score}%</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {r.completed_examples} / {r.total_examples}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/organizations/${organizationId}/ai-evaluation/runs/${r.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        Inspect <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
