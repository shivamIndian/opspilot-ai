import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import type { ChatActionProposal } from '../types/chat.types';

export interface ApprovalCardProps {
  proposal: ChatActionProposal;
  organizationId: string;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ proposal, organizationId }) => {
  const activeOrganization = useOrganizationStore(s => s.activeOrganization);
  const isApprover = activeOrganization?.role === 'owner' || activeOrganization?.role === 'admin';

  const getRiskVariant = (risk?: string) => {
    switch (risk?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'danger' as const;
      case 'medium':
        return 'warning' as const;
      default:
        return 'neutral' as const;
    }
  };

  const riskLabel = (proposal.risk_level || 'medium').toUpperCase();

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 text-xs space-y-2.5 my-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-amber-950 dark:text-amber-200">
            Action Gated: Human Approval Required
          </span>
        </div>
        <Badge variant={getRiskVariant(proposal.risk_level)} size="sm">
          {riskLabel} RISK
        </Badge>
      </div>

      <p className="text-[11px] text-amber-900/90 dark:text-amber-300">
        The agent has prepared a mutation proposal for tool{' '}
        <span className="font-mono font-semibold">{proposal.tool_name}</span>. Per security policy,
        this action requires authorization by an organization administrator before execution.
      </p>

      {proposal.justification && (
        <div className="rounded bg-amber-100/50 dark:bg-amber-900/30 p-2 text-[11px] text-amber-950 dark:text-amber-200">
          <span className="font-medium">Justification: </span>
          {proposal.justification}
        </div>
      )}

      <div className="flex justify-end pt-1">
        {isApprover ? (
          <Link
            to={`/organizations/${organizationId}/approvals`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors cursor-pointer"
          >
            <span>Review in Approval Inbox</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
            <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>Submitted for Administrator Authorization</span>
          </div>
        )}
      </div>
    </div>
  );
};
