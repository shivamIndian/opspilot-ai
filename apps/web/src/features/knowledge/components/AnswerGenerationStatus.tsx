import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface AnswerGenerationStatusProps {
  query: string;
}

export const AnswerGenerationStatus: React.FC<AnswerGenerationStatusProps> = ({ query }) => {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-6 text-center dark:border-blue-900/50 dark:bg-blue-950/20">
      <div className="flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400">
        <Sparkles className="h-5 w-5 animate-pulse" />
        <h3 className="font-semibold">Synthesizing Grounded AI Answer</h3>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Retrieving verified organizational passages and validating source citations for:
      </p>
      <div className="mx-auto mt-2 max-w-lg truncate rounded-md bg-white/80 px-3 py-1.5 text-xs font-mono text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
        "{query}"
      </div>
      <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-blue-700 dark:text-blue-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Executing LLM schema-constrained generation & citation matching...</span>
      </div>
    </div>
  );
};
