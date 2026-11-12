import React from 'react';
import { FileQuestion } from 'lucide-react';

interface InsufficientEvidenceNoticeProps {
  limitations: string[];
}

export const InsufficientEvidenceNotice: React.FC<InsufficientEvidenceNoticeProps> = ({
  limitations,
}) => {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex items-start space-x-3">
        <FileQuestion className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Insufficient Evidence in Knowledge Base
          </h4>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            OpsPilot AI adheres to strict evidence-grounding policies and will not extrapolate or
            fabricate answers when authorized company documents do not contain explicit supporting
            facts.
          </p>

          {limitations && limitations.length > 0 && (
            <div className="mt-3 space-y-1">
              <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
                Reported Limitations:
              </span>
              <ul className="list-disc pl-5 text-xs text-amber-800 dark:text-amber-300">
                {limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
