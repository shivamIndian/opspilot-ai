import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  Layers,
  Ticket,
  Server,
  Terminal,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrganizations } from '@/hooks/useOrganizations';
import {
  useProposalDetails,
  useApproveProposal,
  useRejectProposal,
  useCancelProposal,
} from '../hooks/useApprovals';
import { ProposalStatusBadge, RiskBadge } from '../components/ApprovalBadge';
import { ActionDiffViewer } from '../components/ActionDiffViewer';
import { ApproveActionDialog } from '../components/ApproveActionDialog';
import { RejectActionDialog } from '../components/RejectActionDialog';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import type { SafeAgentProposal } from '../types/agent-approvals.types';

export const ApprovalDetailPage: React.FC = () => {
  const { organizationId, approvalId } = useParams<{
    organizationId: string;
    approvalId: string;
  }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { isOwner, isAdmin } = useOrganizations();
  const isStaff = isOwner || isAdmin;

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: proposal,
    isLoading,
    error,
  } = useProposalDetails(organizationId, approvalId);

  const approveMutation = useApproveProposal(organizationId);
  const rejectMutation = useRejectProposal(organizationId);
  const cancelMutation = useCancelProposal(organizationId);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
        <p className="text-xs text-[var(--text-tertiary)] animate-pulse">
          Loading proposal specifications & security policies...
        </p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
        <Alert variant="error" title="Proposal Not Found">
          {error instanceof Error
            ? error.message
            : 'The requested action proposal does not exist or has expired.'}
        </Alert>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/organizations/${organizationId}/approvals`)}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Approvals</span>
        </Button>
      </div>
    );
  }

  const isAwaiting = proposal.status === 'awaiting_approval';
  const isSelfProposal = Boolean(user?.id && proposal.requestedBy === user.id);
  const isHighRisk = proposal.riskLevel === 'high' || proposal.riskLevel === 'critical';
  const isBlockedByMakerChecker = isSelfProposal && isHighRisk;

  const handleConfirmApprove = async (notes?: string) => {
    try {
      setErrorMessage(null);
      await approveMutation.mutateAsync({ proposalId: proposal.id, notes });
      setIsApproveOpen(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to approve proposal');
    }
  };

  const handleConfirmReject = async (reason: string) => {
    try {
      setErrorMessage(null);
      await rejectMutation.mutateAsync({ proposalId: proposal.id, reason });
      setIsRejectOpen(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reject proposal');
    }
  };

  const handleCancel = async () => {
    try {
      setErrorMessage(null);
      await cancelMutation.mutateAsync({
        proposalId: proposal.id,
        reason: 'Cancelled by operator',
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to cancel proposal');
    }
  };

  const targetTicketId = proposal.proposedAction?.ticketId || proposal.proposedAction?.ticket_id;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Link
          to={`/organizations/${organizationId}/approvals`}
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          Approval Inbox
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)] font-mono">
          {proposal.actionType.toUpperCase()} ({proposal.id.slice(0, 8)})
        </span>
      </div>

      {errorMessage && (
        <Alert
          variant="error"
          title="Operation Failed"
          dismissible
          onDismiss={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {/* Maker-Checker Policy Warning */}
      {isBlockedByMakerChecker && isAwaiting && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Maker-Checker Policy Restriction
              </h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-300 leading-relaxed">
                You initiated this high-risk action proposal ({proposal.riskLevel.toUpperCase()}).
                Per organizational segregation of duties, the requester cannot approve their own
                high-risk mutation. Another authorized administrator must review and execute this
                decision.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Master Proposal Summary Card */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-default)]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <RiskBadge level={proposal.riskLevel} />
              <ProposalStatusBadge status={proposal.status} />
              <span className="font-mono text-xs text-[var(--text-tertiary)]">
                Tool: <strong className="text-[var(--text-primary)]">{proposal.toolName}</strong>
              </span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              {proposal.actionType.replace(/_/g, ' ').toUpperCase()}
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Proposal ID: <span className="font-mono">{proposal.id}</span>
            </p>
          </div>

          {/* Action CTAs */}
          {isAwaiting && (isStaff || isSelfProposal) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {isStaff && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsRejectOpen(true)}
                    className="flex items-center gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                    <span>Reject</span>
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsApproveOpen(true)}
                    disabled={isBlockedByMakerChecker}
                    className="flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve Action</span>
                  </Button>
                </>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancel}
                className="flex items-center gap-1.5 text-slate-500 hover:text-red-600"
              >
                <span>Cancel</span>
              </Button>
            </div>
          )}
        </div>

        {/* Justification Box */}
        {proposal.justification && (
          <div className="rounded-xl bg-[var(--surface-secondary)] p-4 border border-[var(--border-default)] space-y-1">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
              Agent Justification & Business Context
            </span>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed italic">
              "{proposal.justification}"
            </p>
          </div>
        )}

        {/* Metadata Specs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="rounded-xl border border-[var(--border-default)] p-3 space-y-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
              <User className="h-3 w-3" /> Requested By
            </span>
            <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {proposal.requesterName || proposal.requesterEmail || proposal.requestedBy}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] truncate">
              {proposal.requesterEmail || 'system agent'}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] p-3 space-y-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Submitted At
            </span>
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              {new Date(proposal.createdAt).toLocaleDateString()}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">
              {new Date(proposal.createdAt).toLocaleTimeString()}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] p-3 space-y-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
              <Clock className="h-3 w-3" /> Expiration
            </span>
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              {proposal.expiresAt
                ? new Date(proposal.expiresAt).toLocaleDateString()
                : 'No expiration'}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">
              {proposal.expiresAt ? new Date(proposal.expiresAt).toLocaleTimeString() : 'indefinite'}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] p-3 space-y-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
              <Layers className="h-3 w-3" /> Thread & Run ID
            </span>
            <div className="text-xs font-mono text-[var(--text-primary)] truncate" title={proposal.threadId}>
              {proposal.threadId.slice(0, 12)}...
            </div>
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] truncate" title={proposal.runId}>
              {proposal.runId.slice(0, 12)}...
            </div>
          </div>
        </div>
      </div>

      {/* Target Resource Deep Link (if related to a Ticket) */}
      {targetTicketId && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Ticket className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <span className="text-xs font-bold text-blue-950 dark:text-blue-200">
                Target Resource: Support Ticket
              </span>
              <p className="text-[11px] text-blue-800/90 dark:text-blue-300">
                This mutation affects ticket <strong className="font-mono">{targetTicketId}</strong>.
              </p>
            </div>
          </div>
          <Link
            to={`/organizations/${organizationId}/tickets/${targetTicketId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <span>Inspect Ticket</span>
          </Link>
        </div>
      )}

      {/* Proposed Action Payload Diff */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[var(--brand-primary)]" />
          <span>Proposed Action Payload Inspection</span>
        </h3>
        <ActionDiffViewer
          actionType={proposal.actionType}
          proposedAction={proposal.proposedAction}
        />
      </div>

      {/* Decision Audit Trail Card (if decided) */}
      {proposal.approval && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
            <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <CheckCircle2
                className={`h-4 w-4 ${
                  proposal.approval.decision === 'approved' ? 'text-emerald-500' : 'text-rose-500'
                }`}
              />
              <span>Reviewer Decision Record</span>
            </h4>
            <Badge
              variant={proposal.approval.decision === 'approved' ? 'success' : 'danger'}
              size="sm"
            >
              {proposal.approval.decision.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-[var(--text-tertiary)] block">Decided By:</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {proposal.approval.deciderName || proposal.approval.deciderEmail || proposal.approval.decidedBy}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[var(--text-tertiary)] block">Decided At:</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {new Date(proposal.approval.decidedAt).toLocaleString()}
              </span>
            </div>
          </div>

          {proposal.approval.decisionReason && (
            <div className="rounded-lg bg-[var(--surface-secondary)] p-3 text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">Reason / Reviewer Notes: </span>
              {proposal.approval.decisionReason}
            </div>
          )}
        </div>
      )}

      {/* Execution Outcome Card (if executed) */}
      {proposal.execution && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
            <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-500" />
              <span>Downstream Execution Outcome</span>
            </h4>
            <Badge
              variant={
                proposal.execution.executionStatus === 'success'
                  ? 'success'
                  : proposal.execution.executionStatus === 'failed'
                  ? 'danger'
                  : 'neutral'
              }
              size="sm"
            >
              {proposal.execution.executionStatus.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-[var(--text-tertiary)] block">Executed By:</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {proposal.execution.executedBy}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[var(--text-tertiary)] block">Started At:</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {new Date(proposal.execution.startedAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[var(--text-tertiary)] block">Completed At:</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {proposal.execution.completedAt
                  ? new Date(proposal.execution.completedAt).toLocaleString()
                  : 'In progress'}
              </span>
            </div>
          </div>

          {proposal.execution.executionResult && (
            <div className="rounded-lg bg-[var(--surface-secondary)] p-3 text-xs font-mono text-[var(--text-primary)] overflow-x-auto">
              <pre>{JSON.stringify(proposal.execution.executionResult, null, 2)}</pre>
            </div>
          )}

          {proposal.execution.errorDetails && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-700 dark:text-red-400">
              <span className="font-bold">Error Details: </span>
              {JSON.stringify(proposal.execution.errorDetails)}
            </div>
          )}
        </div>
      )}

      {/* Dialog Modals */}
      {proposalToApproveModal(proposal, isApproveOpen, () => setIsApproveOpen(false), handleConfirmApprove)}
      {proposalToRejectModal(proposal, isRejectOpen, () => setIsRejectOpen(false), handleConfirmReject)}
    </div>
  );
};

function proposalToApproveModal(
  proposal: SafeAgentProposal,
  isOpen: boolean,
  onClose: () => void,
  onConfirm: (notes?: string) => Promise<void>
) {
  if (!isOpen) return null;
  return (
    <ApproveActionDialog
      proposal={proposal}
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function proposalToRejectModal(
  proposal: SafeAgentProposal,
  isOpen: boolean,
  onClose: () => void,
  onConfirm: (reason: string) => Promise<void>
) {
  if (!isOpen) return null;
  return (
    <RejectActionDialog
      proposal={proposal}
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
