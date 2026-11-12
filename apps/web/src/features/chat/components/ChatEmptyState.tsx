import React from 'react';
import { Bot, Sparkles, BookOpen, Ticket, Shield } from 'lucide-react';

export interface ChatEmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ onSelectPrompt }) => {
  const suggestions = [
    {
      title: 'Company Knowledge',
      prompt: 'How do I configure employee VPN and SSO access?',
      icon: BookOpen,
      color: 'text-blue-500',
    },
    {
      title: 'Support Operations',
      prompt: 'Check our current open high-priority tickets and triage criteria.',
      icon: Ticket,
      color: 'text-amber-500',
    },
    {
      title: 'Governance & Approvals',
      prompt: 'What actions require human approval before mutation execution?',
      icon: Shield,
      color: 'text-purple-500',
    },
    {
      title: 'General Assistant',
      prompt: 'Summarize our SLA response commitments for customer inquiries.',
      icon: Sparkles,
      color: 'text-emerald-500',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto my-auto space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] shadow-inner">
        <Bot className="h-9 w-9" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
          Welcome to OpsPilot Enterprise Assistant
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          I am powered by a stateful LangGraph workflow engine, grounded in your organization's
          verified documentation, with human-in-the-loop governance for business mutations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="flex items-start gap-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs transition-all hover:border-[var(--brand-primary)] hover:shadow-sm group"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)] group-hover:bg-[var(--brand-primary)]/10 transition-colors">
                <Icon className={`h-3.5 w-3.5 ${item.color}`} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="font-semibold text-[var(--text-primary)]">{item.title}</div>
                <div className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  "{item.prompt}"
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
