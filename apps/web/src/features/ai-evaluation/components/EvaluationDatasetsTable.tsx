import React, { useState } from 'react';
import { Database, Plus, Play, AlertCircle } from 'lucide-react';
import type { EvaluationDataset, EvaluationCategory } from '../types/ai-evaluation.types';

interface EvaluationDatasetsTableProps {
  datasets: EvaluationDataset[];
  isLoading?: boolean;
  onCreateDataset: (data: { name: string; description?: string; category: EvaluationCategory }) => Promise<void>;
  onRunBenchmark: (dataset: EvaluationDataset) => void;
  isRunningBenchmark?: boolean;
}

export const EvaluationDatasetsTable: React.FC<EvaluationDatasetsTableProps> = ({
  datasets,
  isLoading,
  onCreateDataset,
  onRunBenchmark,
  isRunningBenchmark,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EvaluationCategory>('rag_retrieval');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Dataset name is required');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onCreateDataset({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
      });
      setName('');
      setDescription('');
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create evaluation dataset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'rag_retrieval':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
            RAG Retrieval
          </span>
        );
      case 'agent_tool_selection':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
            Agent Tool Calling
          </span>
        );
      case 'answer_quality':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            Answer Quality
          </span>
        );
      case 'citation_accuracy':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
            Citation Validity
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            {cat}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Evaluation Datasets & Ground Truth Benchmarks
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Versioned test collections containing queries, ground-truth context, and expected tool mutations.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" /> New Benchmark Dataset
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <th className="py-3 px-4">Dataset Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Version</th>
              <th className="py-3 px-4">Test Examples</th>
              <th className="py-3 px-4">Last Updated</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading evaluation datasets...</span>
                  </div>
                </td>
              </tr>
            ) : datasets.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No evaluation datasets configured. Click 'New Benchmark Dataset' to start.
                </td>
              </tr>
            ) : (
              datasets.map((ds) => (
                <tr key={ds.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{ds.name}</div>
                    {ds.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {ds.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">{getCategoryBadge(ds.category)}</td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">v{ds.version}</td>
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                    {ds.example_count} example(s)
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(ds.updated_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onRunBenchmark(ds)}
                      disabled={isRunningBenchmark || ds.example_count === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 disabled:opacity-50 transition"
                    >
                      <Play className="w-3 h-3" /> Run Benchmark
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dataset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Create New Evaluation Dataset
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dataset Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Incident Triage Ground Truth"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Evaluation Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EvaluationCategory)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="rag_retrieval">RAG Retrieval (Recall@K, Precision@K, MRR)</option>
                  <option value="agent_tool_selection">Agent Tool Selection & Approval Compliance</option>
                  <option value="answer_quality">Answer Quality & Context Faithfulness</option>
                  <option value="citation_accuracy">Citation Validity & Hallucination Defense</option>
                  <option value="workflow_reliability">Multi-Step Workflow Reliability</option>
                  <option value="regression">Regression Baseline</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the scope, ground truth sources, and evaluation objectives..."
                  rows={3}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition"
                >
                  {isSubmitting ? 'Creating...' : 'Create Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
