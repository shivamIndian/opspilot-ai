import React, { useState } from 'react';
import { GitCompare, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { EvaluationRun, EvaluationComparison } from '../types/ai-evaluation.types';

interface RunComparisonViewProps {
  runs: EvaluationRun[];
  comparison?: EvaluationComparison;
  isLoading?: boolean;
  onCompare: (runIdA: string, runIdB: string) => void;
}

export const RunComparisonView: React.FC<RunComparisonViewProps> = ({
  runs,
  comparison,
  isLoading,
  onCompare,
}) => {
  const [runIdA, setRunIdA] = useState(runs[1]?.id || runs[0]?.id || '');
  const [runIdB, setRunIdB] = useState(runs[0]?.id || '');

  const handleCompareClick = () => {
    if (runIdA && runIdB) {
      onCompare(runIdA, runIdB);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Benchmark Run Comparison & Regression Analysis
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Evaluate metric deltas between prompt revisions, model migrations, or retrieval strategy updates.
        </p>
      </div>

      {/* Selectors */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex-1 w-full space-y-1">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Baseline Run (A)
          </label>
          <select
            value={runIdA}
            onChange={(e) => setRunIdA(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id.slice(0, 8)}... - {r.dataset_name || r.category} (Score:{' '}
                {String(r.summary_metrics?.overall_score || 'N/A')}%)
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-400 mt-4 md:mt-0">
          <ArrowRight className="w-5 h-5 hidden md:block" />
        </div>

        <div className="flex-1 w-full space-y-1">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Candidate Run (B)
          </label>
          <select
            value={runIdB}
            onChange={(e) => setRunIdB(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id.slice(0, 8)}... - {r.dataset_name || r.category} (Score:{' '}
                {String(r.summary_metrics?.overall_score || 'N/A')}%)
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCompareClick}
          disabled={!runIdA || !runIdB || isLoading}
          className="w-full md:w-auto mt-4 md:mt-6 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition shadow-sm self-end"
        >
          {isLoading ? 'Comparing...' : 'Compare Runs'}
        </button>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-4 animate-in fade-in">
          {comparison.notes && (
            <div className="p-3 text-xs bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-blue-900 dark:text-blue-200">
              {comparison.notes}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-4">Quality Metric</th>
                  <th className="py-3 px-4">Baseline (Run A)</th>
                  <th className="py-3 px-4">Candidate (Run B)</th>
                  <th className="py-3 px-4 text-right">Delta Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {Object.entries(comparison.score_deltas).map(([metricKey, delta]) => {
                  const valA = comparison.run_a.summary_metrics[metricKey];
                  const valB = comparison.run_b.summary_metrics[metricKey];
                  const isPositive = delta > 0;
                  const isZero = delta === 0;

                  return (
                    <tr key={metricKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold capitalize text-slate-900 dark:text-slate-100">
                        {metricKey.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {String(valA ?? '—')}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {String(valB ?? '—')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {isZero ? (
                          <span className="text-slate-500">0.0 (No Change)</span>
                        ) : isPositive ? (
                          <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> +{delta}
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" /> {delta}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
