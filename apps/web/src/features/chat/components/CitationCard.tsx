import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ExternalLink } from 'lucide-react';
import type { ChatCitation } from '../types/chat.types';

export interface CitationCardProps {
  citation: ChatCitation;
  organizationId: string;
}

export const CitationCard: React.FC<CitationCardProps> = ({ citation, organizationId }) => {
  const scorePercent = Math.min(100, Math.round(citation.score * 100));

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-2.5 text-xs transition-colors hover:border-[var(--brand-primary)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)] truncate">
          <FileText className="h-3.5 w-3.5 flex-shrink-0 text-[var(--brand-primary)]" />
          <span className="truncate">{citation.filename}</span>
        </div>
        <span className="rounded bg-[var(--surface-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
          {scorePercent}% match
        </span>
      </div>

      {citation.snippet && (
        <p className="line-clamp-2 text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
          "{citation.snippet}"
        </p>
      )}

      <div className="mt-1 flex items-center justify-end">
        <Link
          to={`/organizations/${organizationId}/knowledge`}
          className="flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-primary)] hover:underline"
        >
          <span>View Source Document</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
};
