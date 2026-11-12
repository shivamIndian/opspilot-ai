import React, { useState } from 'react';
import type { SafeAgentProposal } from '../types/agent-approvals.types';
import { RiskBadge } from './ApprovalBadge';
import { ActionDiffViewer } from './ActionDiffViewer';

interface ApproveActionDialogProps {
  proposal: SafeAgentProposal | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
  currentUserId?: string;
}

export const ApproveActionDialog: React.FC<ApproveActionDialogProps> = ({
  proposal,
  isOpen,
  onClose,
  onConfirm,
  currentUserId,
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !proposal) return null;

  const isSelfProposal = currentUserId && proposal.requestedBy === currentUserId;
  const isHighRisk = proposal.riskLevel === 'high' || proposal.riskLevel === 'critical';
  const isBlockedByMakerChecker = isSelfProposal && isHighRisk;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlockedByMakerChecker) {
      setError('Maker-Checker Violation: You cannot approve your own high-risk proposal.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(notes.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve action proposal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Approve Operational Action
            </h3>
            <RiskBadge level={proposal.riskLevel} />
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {isBlockedByMakerChecker && (
            <div className="p-3 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg flex items-start space-x-2">
              <span className="font-bold text-base">&bull;</span>
              <span>
                <strong>Maker-Checker Policy Enforcement:</strong> This action has {proposal.riskLevel.toUpperCase()} risk. Platform security policies strictly prohibit self-approval. Another administrator must review and approve this action.
              </span>
            </div>
          )}

          <ActionDiffViewer
            actionType={proposal.actionType}
            proposedAction={proposal.proposedAction}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Approval Audit Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Verified with team lead, authorized to proceed."
              rows={3}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!isBlockedByMakerChecker}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition"
            >
              {isSubmitting ? 'Approving...' : 'Confirm Approval & Execute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
