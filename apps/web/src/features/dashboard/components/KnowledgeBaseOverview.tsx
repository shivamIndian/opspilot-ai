import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, Clock, AlertCircle, ArrowUpRight, Database } from 'lucide-react';
import type { DocumentDashboardMetrics } from '../types/dashboard.types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export interface KnowledgeBaseOverviewProps {
  organizationId: string;
  data: DocumentDashboardMetrics;
}

export const KnowledgeBaseOverview: React.FC<KnowledgeBaseOverviewProps> = ({
  organizationId,
  data,
}) => {
  const { total, active, archived, processingStatus, totalChunks, embeddedChunks } = data;

  const embeddingRate = totalChunks > 0 ? Math.round((embeddedChunks / totalChunks) * 100) : 100;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <CardTitle>Knowledge Base & Vector Index</CardTitle>
          </div>
          <CardDescription>
            {active} active document(s) • {totalChunks} chunks indexed ({embeddingRate}% vector embedded)
          </CardDescription>
        </div>
        <Link
          to={`/organizations/${organizationId}/documents`}
          className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
        >
          <span>Manage</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <div className="p-5 pt-0 space-y-5">
        {/* Metric summary badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3">
            <div className="text-xs text-[var(--text-secondary)]">Total Documents</div>
            <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">{total}</div>
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">{archived} archived</div>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3">
            <div className="text-xs text-[var(--text-secondary)]">Active in RAG</div>
            <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{active}</div>
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">Searchable</div>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3">
            <div className="text-xs text-[var(--text-secondary)]">Total Chunks</div>
            <div className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-400">{totalChunks}</div>
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">Text segments</div>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3">
            <div className="text-xs text-[var(--text-secondary)]">Embedded Chunks</div>
            <div className="mt-1 text-xl font-bold text-[var(--brand-primary)]">{embeddedChunks}</div>
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">{embeddingRate}% vectorized</div>
          </div>
        </div>

        {/* Ingestion & Pipeline Health */}
        <div className="rounded-lg border border-[var(--border-default)] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Pipeline Status
            </span>
            <span>{processingStatus.failed > 0 ? 'Action Required' : 'Healthy'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[var(--text-secondary)]">Processed:</span>
              <span className="font-semibold text-[var(--text-primary)]">{processingStatus.completed}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[var(--text-secondary)]">In Flight:</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {processingStatus.processing + processingStatus.queued}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-[var(--text-secondary)]">Failed:</span>
              <span className="font-semibold text-[var(--text-primary)]">{processingStatus.failed}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[var(--text-secondary)]">Pending:</span>
              <span className="font-semibold text-[var(--text-primary)]">{processingStatus.pending}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
