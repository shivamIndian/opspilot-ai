import React from 'react';
import { Link } from 'react-router-dom';
import type { SafeAgentProposal } from '../types/agent-approvals.types';
import { ProposalStatusBadge, RiskBadge, ExecutionStatusBadge } from './ApprovalBadge';
import { ActionDiffViewer } from './ActionDiffViewer';
import { ShieldCheck, UserCheck, Clock, Terminal, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

interface ApprovalDetailsDialogProps {
  proposal: SafeAgentProposal | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelProposal?: (proposalId: string) => Promise<void>;
  currentUserId?: string;
}

export const ApprovalDetailsDialog: React.FC<ApprovalDetailsDialogProps> = ({
  proposal,
  isOpen,
  onClose,
  onCancelProposal,
  currentUserId,
}) => {
  if (!isOpen || !proposal) return null;

  const isRequester = currentUserId && proposal.requestedBy === currentUserId;
  const canCancel = proposal.status === 'awaiting_approval' && isRequester && onCancelProposal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Proposal Audit Record
            </h3>
            <ProposalStatusBadge status={proposal.status} />
            <RiskBadge level={proposal.riskLevel} />
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Proposal ID:</span>
              <p className="font-mono text-slate-800 dark:text-slate-200 truncate">{proposal.id}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Tool Name:</span>
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{proposal.toolName}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Action Type:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{proposal.actionType}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Created:</span>
              <p className="text-slate-800 dark:text-slate-200">{new Date(proposal.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Run / Thread:</span>
              <p className="font-mono text-slate-800 dark:text-slate-200 truncate">{proposal.runId.slice(0, 8)}... / {proposal.threadId.slice(0, 8)}...</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Expires At:</span>
              <p className="text-slate-800 dark:text-slate-200">
                {proposal.expiresAt ? new Date(proposal.expiresAt).toLocaleString() : 'No expiry'}
              </p>
            </div>
          </div>

          {/* Justification */}
          {proposal.justification && (
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-xs space-y-1">
              <span className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Agent Intent & Justification:
              </span>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{proposal.justification}</p>
            </div>
          )}

          {/* Action Diff / Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Proposed Mutation Changes
            </h4>
            <ActionDiffViewer
              actionType={proposal.actionType}
              proposedAction={proposal.proposedAction}
            />
          </div>

          {/* Approval Record */}
          {proposal.approval && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-2 bg-slate-50/70 dark:bg-slate-950/40 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-500" /> Human Reviewer Decision
                </span>
                <span className={`px-2 py-0.5 rounded font-semibold uppercase text-[10px] ${
                  proposal.approval.decision === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}>
                  {proposal.approval.decision}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                <div>
                  <span>Reviewer: </span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {proposal.approval.deciderName || proposal.approval.deciderEmail || proposal.approval.decidedBy}
                  </span>
                </div>
                <div>
                  <span>Decided At: </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {new Date(proposal.approval.decidedAt).toLocaleString()}
                  </span>
                </div>
              </div>
              {proposal.approval.decisionReason && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Reason / Notes:</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                    {proposal.approval.decisionReason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Execution Record */}
          {proposal.execution && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-2 bg-slate-50/70 dark:bg-slate-950/40 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> System Execution Gateway
                </span>
                <ExecutionStatusBadge status={proposal.execution.executionStatus} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                <div>
                  <span>Idempotency Key: </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate block">
                    {proposal.execution.idempotencyKey}
                  </span>
                </div>
                <div>
                  <span>Target Entity: </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {proposal.execution.targetEntityType}:{proposal.execution.targetEntityId || 'N/A'}
                  </span>
                </div>
                <div>
                  <span>Started At: </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {new Date(proposal.execution.startedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span>Completed At: </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {proposal.execution.completedAt ? new Date(proposal.execution.completedAt).toLocaleString() : 'In progress'}
                  </span>
                </div>
              </div>

              {proposal.execution.executionResult && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Execution Result Payload:
                  </span>
                  <pre className="mt-1 p-2 rounded bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-36">
                    {JSON.stringify(proposal.execution.executionResult, null, 2)}
                  </pre>
                </div>
              )}

              {proposal.execution.errorDetails && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Failure Diagnostics:
                  </span>
                  <pre className="mt-1 p-2 rounded bg-red-950 text-red-200 font-mono text-[11px] overflow-x-auto max-h-36">
                    {JSON.stringify(proposal.execution.errorDetails, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Link
              to={`/organizations/${proposal.organizationId}/approvals/${proposal.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
            >
              <span>Open Dedicated Page</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            {canCancel && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to cancel this pending proposal?')) {
                    await onCancelProposal(proposal.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
              >
                Cancel Proposal
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
