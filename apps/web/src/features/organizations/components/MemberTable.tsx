import React from 'react';
import type { OrganizationMember, OrganizationRole } from '@/types/organization';
import { Shield, UserCheck, Trash2 } from 'lucide-react';

export const MemberTable: React.FC<{
  members: OrganizationMember[];
  currentUserId: string;
  actorRole?: OrganizationRole;
  onUpdateRole?: (memberId: string, newRole: 'admin' | 'member') => Promise<void>;
  onRemoveMember?: (memberId: string, memberName: string) => Promise<void>;
  isLoading?: boolean;
}> = ({ members, currentUserId, actorRole, onUpdateRole, onRemoveMember, isLoading }) => {
  const isOwner = actorRole === 'owner';
  const isAdmin = actorRole === 'admin';

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
          <tr>
            <th className="py-3 px-4">Member</th>
            <th className="py-3 px-4">Role</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Joined Date</th>
            {(isOwner || isAdmin) && <th className="py-3 px-4 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80 text-slate-300">
          {members.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-slate-500">
                No members found matching your search criteria.
              </td>
            </tr>
          ) : (
            members.map(member => {
              const isSelf = member.userId === currentUserId;
              const isTargetOwner = member.role === 'owner';
              const isTargetAdmin = member.role === 'admin';

              // Permissions to modify target:
              // Owner can modify anyone except self owner role (must transfer)
              // Admin can only modify normal members
              const canModifyRole =
                !isTargetOwner && (isOwner || (isAdmin && !isTargetAdmin && !isSelf));

              const canRemove =
                !isTargetOwner && !isSelf && (isOwner || (isAdmin && !isTargetAdmin));

              return (
                <tr key={member.membershipId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{member.name}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {canModifyRole && onUpdateRole ? (
                      <select
                        value={member.role}
                        disabled={isLoading}
                        onChange={e =>
                          onUpdateRole(member.membershipId, e.target.value as 'admin' | 'member')
                        }
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                      >
                        <option value="member">Member</option>
                        {isOwner && <option value="admin">Admin</option>}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase border ${
                          member.role === 'owner'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                            : member.role === 'admin'
                              ? 'bg-purple-950/60 text-purple-300 border-purple-800/50'
                              : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50'
                        }`}
                      >
                        {member.role === 'owner' ? (
                          <Shield className="w-2.5 h-2.5" />
                        ) : (
                          <UserCheck className="w-2.5 h-2.5" />
                        )}
                        {member.role}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        member.status === 'active'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>

                  {(isOwner || isAdmin) && (
                    <td className="py-3.5 px-4 text-right">
                      {canRemove && onRemoveMember && (
                        <button
                          onClick={() => onRemoveMember(member.membershipId, member.name)}
                          disabled={isLoading}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
