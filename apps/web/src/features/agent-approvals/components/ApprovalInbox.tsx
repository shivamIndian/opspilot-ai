import React, { useState, useEffect, useCallback } from 'react';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { agentApprovalService } from '../services/agent-approval.service';
import type {
  SafeAgentProposal,
  ProposalRiskLevel,
  ProposalStatus,
} from '../types/agent-approvals.types';
import { ApprovalCard } from './ApprovalCard';
import { ApproveActionDialog } from './ApproveActionDialog';
import { RejectActionDialog } from './RejectActionDialog';
import { ApprovalDetailsDialog } from './ApprovalDetailsDialog';
import {
  ShieldAlert,
  Clock,
  History,
  Filter,
  Search,
  RefreshCw,
  AlertCircle,
  Inbox,
} from 'lucide-react';

export const ApprovalInbox: React.FC = () => {
  const activeOrganization = useOrganizationStore(s => s.activeOrganization);
  const user = useAuthStore(s => s.user);

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedRisk, setSelectedRisk] = useState<ProposalRiskLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [proposals, setProposals] = useState<SafeAgentProposal[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal dialog states
  const [proposalToApprove, setProposalToApprove] = useState<SafeAgentProposal | null>(null);
  const [proposalToReject, setProposalToReject] = useState<SafeAgentProposal | null>(null);
  const [proposalToView, setProposalToView] = useState<SafeAgentProposal | null>(null);

  const fetchProposals = useCallback(async () => {
    if (!activeOrganization) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const statusFilter: ProposalStatus | undefined =
        activeTab === 'pending' ? 'awaiting_approval' : undefined;

      const riskFilter = selectedRisk === 'all' ? undefined : selectedRisk;

      const res = await agentApprovalService.listProposals(activeOrganization.id, {
        status: statusFilter,
        riskLevel: riskFilter,
        page,
        limit,
      });

      // Filter locally for history tab (to exclude awaiting_approval if viewing history)
      let items = res.items;
      if (activeTab === 'history') {
        items = items.filter(p => p.status !== 'awaiting_approval');
      }

      setProposals(items);
      setTotalCount(res.total);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load operational action proposals.');
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganization, activeTab, selectedRisk, page, limit]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleApproveConfirm = async (notes?: string) => {
    if (!activeOrganization || !proposalToApprove) return;
    await agentApprovalService.approveProposal(
      activeOrganization.id,
      proposalToApprove.id,
      notes
    );
    await fetchProposals();
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!activeOrganization || !proposalToReject) return;
    await agentApprovalService.rejectProposal(
      activeOrganization.id,
      proposalToReject.id,
      reason
    );
    await fetchProposals();
  };

  const handleCancelProposal = async (proposalId: string) => {
    if (!activeOrganization) return;
    await agentApprovalService.cancelProposal(activeOrganization.id, proposalId);
    await fetchProposals();
  };

  // Filter proposals by client-side search query
  const filteredProposals = proposals.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const actionMatch = p.actionType.toLowerCase().includes(q);
    const toolMatch = p.toolName.toLowerCase().includes(q);
    const idMatch = p.id.toLowerCase().includes(q);
    const justificationMatch = p.justification?.toLowerCase().includes(q) ?? false;
    const titleMatch = (p.proposedAction.title as string)?.toLowerCase().includes(q) ?? false;
    return actionMatch || toolMatch || idMatch || justificationMatch || titleMatch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Agent Operational Approvals
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Human-in-the-loop review, authorization, and audit trail for autonomous agent actions with Maker-Checker policy enforcement.
          </p>
        </div>

        <button
          onClick={() => fetchProposals()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-start gap-3 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">Unable to fetch proposals</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Tabs and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-slate-100/60 dark:bg-slate-900/60 self-start">
          <button
            type="button"
            onClick={() => {
              setActiveTab('pending');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Awaiting Approval
            {activeTab === 'pending' && totalCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-[10px]">
                {totalCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            Audit History
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Risk Level Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Risk:
            </span>
            {(['all', 'low', 'medium', 'high', 'critical'] as const).map(risk => (
              <button
                key={risk}
                type="button"
                onClick={() => {
                  setSelectedRisk(risk);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium uppercase transition-colors ${
                  selectedRisk === risk
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search actions or ticket..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Content List / Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 animate-pulse"
            />
          ))}
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center bg-slate-50/50 dark:bg-slate-950/20">
          <Inbox className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {activeTab === 'pending' ? 'No pending operational approvals' : 'No audit history found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {activeTab === 'pending'
              ? 'Autonomous agent workflow proposals requiring human authorization will appear here.'
              : 'Completed, approved, and rejected actions will be retained here for compliance and auditing.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProposals.map(proposal => (
            <ApprovalCard
              key={proposal.id}
              proposal={proposal}
              currentUserId={user?.id}
              onApprove={p => setProposalToApprove(p)}
              onReject={p => setProposalToReject(p)}
              onViewDetails={p => setProposalToView(p)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ApproveActionDialog
        proposal={proposalToApprove}
        isOpen={Boolean(proposalToApprove)}
        onClose={() => setProposalToApprove(null)}
        onConfirm={handleApproveConfirm}
        currentUserId={user?.id}
      />

      <RejectActionDialog
        proposal={proposalToReject}
        isOpen={Boolean(proposalToReject)}
        onClose={() => setProposalToReject(null)}
        onConfirm={handleRejectConfirm}
      />

      <ApprovalDetailsDialog
        proposal={proposalToView}
        isOpen={Boolean(proposalToView)}
        onClose={() => setProposalToView(null)}
        onCancelProposal={handleCancelProposal}
        currentUserId={user?.id}
      />
    </div>
  );
};
