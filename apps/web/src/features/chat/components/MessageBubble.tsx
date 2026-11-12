import React, { useState } from 'react';
import { User, Bot, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '../types/chat.types';
import { CitationCard } from './CitationCard';
import { ApprovalCard } from './ApprovalCard';
import { AgentActivityIndicator } from './AgentActivityIndicator';

export interface MessageBubbleProps {
  message: ChatMessage;
  organizationId: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, organizationId }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe simple markdown renderer without external heavy parsers
  const renderFormattedContent = (content: string) => {
    // Check if contains code blocks
    if (content.includes('```')) {
      const parts = content.split(/(```[\s\S]*?```)/g);
      return parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const firstLine = lines[0]?.trim() || '';
          const isLang = /^[a-z0-9_-]+$/i.test(firstLine);
          const lang = isLang ? firstLine : '';
          const code = isLang ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div key={index} className="my-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden font-mono text-xs">
              {lang && (
                <div className="flex items-center justify-between bg-[var(--surface-primary)] px-3 py-1 text-[10px] uppercase font-semibold text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
                  <span>{lang}</span>
                </div>
              )}
              <pre className="p-3 overflow-x-auto text-[var(--text-primary)]">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        return <span key={index} className="whitespace-pre-wrap">{part}</span>;
      });
    }

    return <span className="whitespace-pre-wrap">{content}</span>;
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-2.5 my-3">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[70%]">
          <div className="rounded-2xl rounded-tr-sm bg-[var(--brand-primary)] px-4 py-2.5 text-xs text-white shadow-sm leading-relaxed">
            {message.content}
          </div>
          <span className="mt-1 text-[10px] text-[var(--text-tertiary)]">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] mt-0.5">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2.5 my-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-purple-600/15 text-purple-600 dark:text-purple-400 mt-0.5">
        <Bot className="h-4 w-4" />
      </div>

      <div className="flex flex-col items-start max-w-[90%] sm:max-w-[80%] space-y-2">
        <div className="rounded-2xl rounded-tl-sm border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 text-xs text-[var(--text-primary)] shadow-sm leading-relaxed w-full">
          {/* Tool execution indicator if tools were called */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mb-3">
              <AgentActivityIndicator toolCalls={message.toolCalls} />
            </div>
          )}

          {/* Formatted textual content */}
          <div className="leading-relaxed">{renderFormattedContent(message.content)}</div>

          {/* Action proposals requiring human approval */}
          {message.actionProposals && message.actionProposals.length > 0 && (
            <div className="mt-3">
              {message.actionProposals.map((prop, idx) => (
                <ApprovalCard key={idx} proposal={prop} organizationId={organizationId} />
              ))}
            </div>
          )}

          {/* RAG Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-4 border-t border-[var(--border-default)] pt-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)] mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Verified Enterprise Sources ({message.citations.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {message.citations.map((c, idx) => (
                  <CitationCard key={idx} citation={c} organizationId={organizationId} />
                ))}
              </div>
            </div>
          )}

          {/* Failure or warning status indicator */}
          {message.status === 'failed' && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-500">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Generation completed with warnings or error state.</span>
            </div>
          )}
        </div>

        {/* Message footer: copy and timestamp */}
        <div className="flex items-center gap-3 pl-1 text-[10px] text-[var(--text-tertiary)]">
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
            title="Copy response"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
