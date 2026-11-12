import React from 'react';
import { Cpu, ShieldAlert, BarChart3 } from 'lucide-react';
import type { ToolExecutionMetric } from '../types/agent-monitoring.types';

interface ToolExecutionSummaryProps {
  tools: ToolExecutionMetric[];
  isLoading?: boolean;
}

export const ToolExecutionSummary: React.FC<ToolExecutionSummaryProps> = ({
  tools,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 animate-pulse">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
        </div>
      </div>
    );
  }

  const maxCalls = Math.max(...tools.map((t) => t.totalCalls), 1);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Registered Tool Execution Frequency
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {tools.length} active tool(s)
        </span>
      </div>

      {tools.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No tool executions recorded in recent workflows.
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((t) => {
            const percentage = Math.round((t.totalCalls / maxCalls) * 100);
            return (
              <div key={t.toolName} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-slate-400" />
                    {t.toolName}
                  </span>
                  <div className="flex items-center gap-2">
                    {t.requiresApprovalCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                        <ShieldAlert className="w-3 h-3" /> {t.requiresApprovalCount} proposed
                      </span>
                    )}
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {t.totalCalls} call(s)
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
