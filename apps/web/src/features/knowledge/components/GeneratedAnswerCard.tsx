import React, { useState } from 'react';
import { Sparkles, Copy, Check, ShieldCheck, Cpu, Clock, Layers, HelpCircle } from 'lucide-react';
import type { KnowledgeAnswerResponse } from '@/types/knowledge';
import { AnswerCitationList } from './AnswerCitationList';
import { InsufficientEvidenceNotice } from './InsufficientEvidenceNotice';

interface GeneratedAnswerCardProps {
  response: KnowledgeAnswerResponse;
  onAskFollowUp?: (question: string) => void;
}

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
            {response.answer.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="whitespace-pre-wrap">
                {paragraph}
              </p>
            ))}
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
