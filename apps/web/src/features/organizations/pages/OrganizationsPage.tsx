import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganizations } from '@/hooks/useOrganizations';
import { organizationService } from '@/services/organizationService';
import type { OrganizationInvitation } from '@/types/organization';
import { OrganizationCard } from '../components/OrganizationCard';
import { Building2, Plus, Loader2, Mail, CheckCircle2 } from 'lucide-react';

export const OrganizationsPage: React.FC = () => {
  const { organizations, activeOrganization, isLoading, fetchOrganizations } = useOrganizations();
  const [pendingInvitations, setPendingInvitations] = useState<Array<OrganizationInvitation & { organizationName: string }>>([]);
  const [isAcceptingId, setIsAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
    organizationService
      .listMyPendingInvitations()
      .then(invs => setPendingInvitations(invs))
      .catch(err => console.warn('Failed to fetch pending invitations', err));
  }, [fetchOrganizations]);

  const handleAcceptDirect = async (invitationId: string) => {
    setIsAcceptingId(invitationId);
    try {
      const res = await organizationService.acceptInvitationDirect(invitationId);
      window.location.href = `/organizations/${res.organization.id}`;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to accept invitation';
      alert(msg);
      setIsAcceptingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <span>Organizations</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your multi-tenant workspaces, team memberships, and security roles
          </p>
        </div>

        <Link
          to="/organizations/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Organization</span>
        </Link>
      </div>

      {/* Pending Invitations Banner */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-4 animate-in fade-in">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>Pending Invitations ({pendingInvitations.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingInvitations.map(inv => (
              <div
                key={inv.id}
                className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 p-6 shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider font-mono">
                      Role: {inv.role}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">
                    {inv.organizationName || 'Enterprise Workspace'}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    You have been invited by <strong className="text-white font-medium">{inv.invitedByName || 'an administrator'}</strong> to join this organization workspace.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAcceptDirect(inv.id)}
                  disabled={Boolean(isAcceptingId)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAcceptingId === inv.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Joining Workspace...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Invitation & Enter Workspace</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && organizations.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading your organizations...</p>
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No organizations found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              You are not currently an active member of any organization. Create a new organization
              to start building with autonomous AI agents.
            </p>
          </div>
          <Link
            to="/organizations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create your first organization</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map(org => (
            <OrganizationCard
              key={org.id}
              organization={org}
              isActive={activeOrganization?.id === org.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
