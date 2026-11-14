import React from 'react';
import type { SafeAgentProposal } from '../types/agent-approvals.types';
import { ProposalStatusBadge, RiskBadge } from './ApprovalBadge';
import { UserCheck, Check, X, Info } from 'lucide-react';

interface ApprovalCardProps {
  proposal: SafeAgentProposal;
  currentUserId?: string;
  onApprove: (proposal: SafeAgentProposal) => void;
  onReject: (proposal: SafeAgentProposal) => void;
  onViewDetails: (proposal: SafeAgentProposal) => void;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  proposal,
  currentUserId,
  onApprove,
  onReject,
  onViewDetails,
}) => {
  const isAwaiting = proposal.status === 'awaiting_approval';
  const isSelfProposal = currentUserId && proposal.requestedBy === currentUserId;
  const isHighRisk = proposal.riskLevel === 'high' || proposal.riskLevel === 'critical';
  const isBlockedByMakerChecker = isSelfProposal && isHighRisk;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
      <div>
        {/* Header Badges & Timestamp */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <RiskBadge level={proposal.riskLevel} />
            <ProposalStatusBadge status={proposal.status} />
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {new Date(proposal.createdAt).toLocaleDateString()} {new Date(proposal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Action Type & Tool */}
        <div className="mb-2">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            {proposal.actionType.replace(/_/g, ' ').toUpperCase()}
          </h4>
          <span className="inline-block mt-0.5 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
            tool: {proposal.toolName}
          </span>
        </div>

        {/* Justification summary */}
        {proposal.justification && (
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 bg-slate-50 dark:bg-slate-950/60 p-2 rounded border border-slate-200 dark:border-slate-800">
            {proposal.justification}
          </p>
        )}

        {/* Proposed Parameters Preview */}
        <div className="text-xs bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 mb-4">
          {proposal.proposedAction.title && (
            <div className="truncate">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Title: </span>
              <span className="text-slate-900 dark:text-slate-100">{String(proposal.proposedAction.title)}</span>
            </div>
          )}
          {proposal.proposedAction.target && (
            <div className="truncate">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Target: </span>
              <span className="font-mono text-slate-900 dark:text-slate-100">{String(proposal.proposedAction.target)}</span>
            </div>
          )}
          {proposal.proposedAction.namespace && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Namespace: </span>
              <span className="font-mono text-blue-600 dark:text-blue-400">{String(proposal.proposedAction.namespace)}</span>
            </div>
          )}
          {proposal.proposedAction.action && (
            <div className="truncate">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Command: </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">{String(proposal.proposedAction.action)}</span>
            </div>
          )}
          {proposal.proposedAction.priority && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Priority: </span>
              <span className="uppercase text-[11px] font-bold text-blue-600 dark:text-blue-400">
                {String(proposal.proposedAction.priority)}
              </span>
            </div>
          )}
          {proposal.proposedAction.status && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Target Status: </span>
              <span className="uppercase text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {String(proposal.proposedAction.status)}
              </span>
            </div>
          )}
          {proposal.proposedAction.ticketId && (
            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Ticket ID: {String(proposal.proposedAction.ticketId)}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(proposal)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <Info className="w-3.5 h-3.5" /> Details
        </button>

        {isAwaiting ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onReject(proposal)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/80 border border-rose-200 dark:border-rose-900 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Reject
            </button>
            <button
              type="button"
              onClick={() => onApprove(proposal)}
              disabled={Boolean(isBlockedByMakerChecker)}
              title={isBlockedByMakerChecker ? 'Maker-Checker policy prohibits self-approval of high-risk actions' : 'Approve action'}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" /> Approve
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            {proposal.approval ? (
              <span className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-blue-500" />
                Decided by {proposal.approval.deciderName || proposal.approval.deciderEmail || 'admin'}
              </span>
            ) : (
              <span>Resolved</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
