import React from 'react';
import { Bot, CheckCircle2, Loader2, Wrench } from 'lucide-react';
import type { ChatToolActivity } from '../types/chat.types';

export interface AgentActivityIndicatorProps {
  toolCalls?: ChatToolActivity[];
  isGenerating?: boolean;
}

export const AgentActivityIndicator: React.FC<AgentActivityIndicatorProps> = ({
  toolCalls = [],
  isGenerating = false,
}) => {
  if (!isGenerating && toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)]/50 p-2.5 text-xs text-[var(--text-secondary)]">
      <div className="flex items-center gap-2 font-medium">
        {isGenerating ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--brand-primary)]" />
            <span>Agent Orchestration in Progress...</span>
          </>
        ) : (
          <>
            <Bot className="h-3.5 w-3.5 text-emerald-500" />
            <span>Agent Workflow Completed</span>
          </>
        )}
      </div>

      {toolCalls.length > 0 && (
        <div className="space-y-1 pl-5">
          {toolCalls.map((t, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
              <Wrench className="h-3 w-3 text-indigo-500" />
              <span>
                Executed tool <span className="font-mono font-medium text-[var(--text-primary)]">{t.toolName}</span>
              </span>
              <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
