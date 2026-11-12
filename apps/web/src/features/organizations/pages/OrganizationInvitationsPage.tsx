import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { SafeOrganization, OrganizationInvitation } from '@/types/organization';
import { organizationService } from '@/services/organizationService';
import { InvitationTable } from '../components/InvitationTable';
import { InviteMemberDialog } from '../components/InviteMemberDialog';
import { Mail, UserPlus, Filter, Loader2, AlertCircle } from 'lucide-react';

export const OrganizationInvitationsPage: React.FC = () => {
  const { organization } = useOutletContext<{ organization: SafeOrganization }>();

  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await organizationService.listInvitations(organization.id, {
        status: statusFilter || undefined,
      });
      setInvitations(data.invitations);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to fetch invitations';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  }, [organization.id, statusFilter]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleResend = async (invitationId: string) => {
    setStatusMessage(null);
    try {
      await organizationService.resendInvitation(organization.id, invitationId);
      setStatusMessage({ type: 'success', text: 'Invitation resent successfully.' });
      await fetchInvitations();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to resend invitation';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) {
      return;
    }
    setStatusMessage(null);
    try {
      await organizationService.revokeInvitation(organization.id, invitationId);
      setStatusMessage({ type: 'success', text: 'Invitation revoked.' });
      await fetchInvitations();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to revoke invitation';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleInvite = async (email: string, role: 'admin' | 'member') => {
    await organizationService.createInvitation(organization.id, { email, role });
    setStatusMessage({ type: 'success', text: `Invitation dispatched to ${email}` });
    await fetchInvitations();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            <span>Organization Invitations</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track pending invitations and dispatch invitations to new collaborators
          </p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Invite Member</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading invitations list...</p>
        </div>
      ) : (
        <InvitationTable
          invitations={invitations}
          actorRole={organization.role}
          onResend={handleResend}
          onRevoke={handleRevoke}
          isLoading={isLoading}
        />
      )}

      <InviteMemberDialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInvite={handleInvite}
        actorRole={organization.role}
      />
    </div>
  );
};
