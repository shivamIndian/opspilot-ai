import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import type { SafeOrganization, OrganizationMember } from '@/types/organization';
import { organizationService } from '@/services/organizationService';
import { useAuth } from '@/hooks/useAuth';
import { MemberTable } from '../components/MemberTable';
import { InviteMemberDialog } from '../components/InviteMemberDialog';
import { Users, UserPlus, Search, Filter, Loader2, AlertCircle, LogOut } from 'lucide-react';

export const OrganizationMembersPage: React.FC = () => {
  const { organization } = useOutletContext<{ organization: SafeOrganization }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await organizationService.listMembers(organization.id, {
        search: search.trim() || undefined,
        role: roleFilter || undefined,
      });
      setMembers(data.members);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to fetch members';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  }, [organization.id, search, roleFilter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'member') => {
    setStatusMessage(null);
    try {
      await organizationService.updateMemberRole(organization.id, memberId, newRole);
      setStatusMessage({ type: 'success', text: 'Member role updated successfully.' });
      await fetchMembers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to update member role';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this organization?`)) {
      return;
    }
    setStatusMessage(null);
    try {
      await organizationService.removeMember(organization.id, memberId);
      setStatusMessage({ type: 'success', text: `${memberName} has been removed.` });
      await fetchMembers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to remove member';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleLeaveOrganization = async () => {
    if (organization.role === 'owner') {
      alert('As the primary owner, you cannot leave without transferring ownership first.');
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to leave ${organization.name}? You will lose all access.`
      )
    ) {
      return;
    }
    try {
      await organizationService.leaveOrganization(organization.id);
      navigate('/organizations');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to leave organization';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleInvite = async (email: string, role: 'admin' | 'member') => {
    await organizationService.createInvitation(organization.id, { email, role });
    setStatusMessage({ type: 'success', text: `Invitation dispatched to ${email}` });
  };

  const isOwner = organization.role === 'owner';
  const isAdmin = organization.role === 'admin' || isOwner;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Organization Members</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View active collaborators and manage organizational access controls
          </p>
        </div>

        <div className="flex items-center gap-3">
          {organization.role !== 'owner' && (
            <button
              onClick={handleLeaveOrganization}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-700/60 text-slate-300 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Workspace</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Member</span>
            </button>
          )}
        </div>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by member name or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading members list...</p>
        </div>
      ) : (
        <MemberTable
          members={members}
          currentUserId={user?.id || ''}
          actorRole={organization.role}
          onUpdateRole={handleUpdateRole}
          onRemoveMember={handleRemoveMember}
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
