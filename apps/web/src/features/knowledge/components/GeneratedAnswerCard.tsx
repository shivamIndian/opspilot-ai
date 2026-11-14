import React, { useState } from 'react';
import { Sparkles, Copy, Check, ShieldCheck, Cpu, Clock, Layers, HelpCircle } from 'lucide-react';
import type { KnowledgeAnswerResponse } from '@/types/knowledge';
import { AnswerCitationList } from './AnswerCitationList';
import { InsufficientEvidenceNotice } from './InsufficientEvidenceNotice';

interface GeneratedAnswerCardProps {
  response: KnowledgeAnswerResponse;
  onAskFollowUp?: (question: string) => void;
}

const renderInline = (str: string): React.ReactNode => {
  const tokens = str.split(/(`[^`]+`|\*\*[^*]+\*\*|\[S\d+\])/g);
  return tokens.map((token, tIdx) => {
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code
          key={tIdx}
          className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={tIdx} className="font-semibold text-slate-900 dark:text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (/^\[S\d+\]$/.test(token)) {
      return (
        <span
          key={tIdx}
          className="inline-flex items-center rounded bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 ml-1"
        >
          {token}
        </span>
      );
    }
    return token;
  });
};

const renderFormattedAnswer = (text: string) => {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const firstLineEnd = part.indexOf('\n');
      const lang = firstLineEnd !== -1 ? part.slice(3, firstLineEnd).trim() : '';
      const code = firstLineEnd !== -1 ? part.slice(firstLineEnd + 1, -3) : part.slice(3, -3);

      return (
        <div
          key={index}
          className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-sm"
        >
          {lang && (
            <div className="bg-slate-900 px-3.5 py-1 text-[11px] font-mono text-slate-400 border-b border-slate-800 flex justify-between items-center">
              <span>{lang}</span>
            </div>
          )}
          <pre className="p-3.5 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
            <code>{code.trim()}</code>
          </pre>
        </div>
      );
    }

    const paragraphs = part.split(/\n\n+/);
    return (
      <div key={index} className="space-y-2">
        {paragraphs.map((p, pIdx) => {
          const trimmed = p.trim();
          if (!trimmed) return null;

          if (trimmed.startsWith('### ')) {
            return (
              <h3
                key={pIdx}
                className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-4 mb-1"
              >
                {renderInline(trimmed.slice(4))}
              </h3>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2
                key={pIdx}
                className="text-base font-bold text-slate-900 dark:text-slate-100 mt-4 mb-1"
              >
                {renderInline(trimmed.slice(3))}
              </h2>
            );
          }

          const lines = trimmed.split('\n');
          return (
            <div key={pIdx} className="space-y-1">
              {lines.map((line, lIdx) => {
                const lTrim = line.trim();
                if (lTrim.startsWith('- ') || lTrim.startsWith('* ')) {
                  return (
                    <div
                      key={lIdx}
                      className="flex items-start gap-2 text-xs leading-relaxed pl-1 text-slate-700 dark:text-slate-300"
                    >
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{renderInline(lTrim.slice(2))}</span>
                    </div>
                  );
                }
                if (/^\d+\.\s/.test(lTrim)) {
                  const num = lTrim.match(/^(\d+\.)\s/)?.[1];
                  const rest = lTrim.replace(/^\d+\.\s/, '');
                  return (
                    <div
                      key={lIdx}
                      className="flex items-start gap-2 text-xs leading-relaxed pl-1 text-slate-700 dark:text-slate-300"
                    >
                      <span className="text-blue-500 font-semibold">{num}</span>
                      <span>{renderInline(rest)}</span>
                    </div>
                  );
                }
                return (
                  <p key={lIdx} className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {renderInline(line)}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  });
};

export const GeneratedAnswerCard: React.FC<GeneratedAnswerCardProps> = ({
  response,
  onAskFollowUp,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200/80 bg-linear-to-b from-blue-50/40 to-white shadow-sm dark:border-blue-900/40 dark:from-blue-950/20 dark:to-gray-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white/70 px-6 py-4 backdrop-blur-xs dark:border-gray-800 dark:bg-gray-900/60">
        <div className="flex items-center space-x-2.5">
          <div className="rounded-lg bg-blue-600 p-1.5 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              OpsPilot Grounded Answer
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Evidence-grounded synthesis with verified citation tracking
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Authorized Knowledge</span>
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750"
            title="Copy answer to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5 p-6">
        {response.insufficientEvidence && (
          <InsufficientEvidenceNotice limitations={response.limitations} />
        )}

        {/* Answer Content */}
        <div className="space-y-3">
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-gray-800 dark:text-gray-200">
            {renderFormattedAnswer(response.answer)}
          </div>
        </div>

        {/* Validated Citations */}
        {response.citations && response.citations.length > 0 && (
          <div className="pt-2">
            <AnswerCitationList citations={response.citations} />
          </div>
        )}

        {/* Follow-up Questions Suggestions */}
        {response.followUpQuestions && response.followUpQuestions.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-850/50">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
              <span>Suggested Follow-up Inquiries</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {response.followUpQuestions.map((question, qIdx) => (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => onAskFollowUp && onAskFollowUp(question)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-left text-xs text-gray-700 shadow-2xs transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Telemetry Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-2.5 text-2xs text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <Cpu className="h-3 w-3" />
            <span>
              {response.metadata.provider}: {response.metadata.model}
            </span>
          </span>
          <span className="flex items-center space-x-1">
            <Layers className="h-3 w-3" />
            <span className="capitalize">{response.metadata.retrievalMode} Mode</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {response.metadata.usage.totalTokens !== null && (
            <span>Tokens: {response.metadata.usage.totalTokens}</span>
          )}
          {response.metadata.latencyMs !== null && (
            <span className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{response.metadata.latencyMs}ms</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
