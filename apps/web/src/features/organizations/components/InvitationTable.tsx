import React from 'react';
import type { OrganizationInvitation, OrganizationRole } from '@/types/organization';
import { Mail, RefreshCw, XCircle, Shield, UserCheck } from 'lucide-react';

export const InvitationTable: React.FC<{
  invitations: OrganizationInvitation[];
  actorRole?: OrganizationRole;
  onResend?: (invitationId: string) => Promise<void>;
  onRevoke?: (invitationId: string) => Promise<void>;
  isLoading?: boolean;
}> = ({ invitations, actorRole, onResend, onRevoke, isLoading }) => {
  const isOwner = actorRole === 'owner';
  const isAdmin = actorRole === 'admin';

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
          <tr>
            <th className="py-3 px-4">Invited Email</th>
            <th className="py-3 px-4">Role</th>
            <th className="py-3 px-4">Invited By</th>
            <th className="py-3 px-4">Expires</th>
            <th className="py-3 px-4">Status</th>
            {(isOwner || isAdmin) && <th className="py-3 px-4 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80 text-slate-300">
          {invitations.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-slate-500">
                No active or pending invitations.
              </td>
            </tr>
          ) : (
            invitations.map(invitation => {
              const isTargetAdmin = invitation.role === 'admin';
              const canManage =
                invitation.status === 'pending' && (isOwner || (isAdmin && !isTargetAdmin));

              return (
                <tr key={invitation.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="font-semibold text-white font-mono">{invitation.email}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase border ${
                        invitation.role === 'admin'
                          ? 'bg-purple-950/60 text-purple-300 border-purple-800/50'
                          : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50'
                      }`}
                    >
                      {invitation.role === 'admin' ? (
                        <Shield className="w-2.5 h-2.5" />
                      ) : (
                        <UserCheck className="w-2.5 h-2.5" />
                      )}
                      {invitation.role}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    {invitation.invitedByName || 'Team Member'}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        invitation.status === 'pending'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                          : invitation.status === 'accepted'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                            : 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                      }`}
                    >
                      {invitation.status}
                    </span>
                  </td>

                  {(isOwner || isAdmin) && (
                    <td className="py-3.5 px-4 text-right">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          {onResend && (
                            <button
                              onClick={() => onResend(invitation.id)}
                              disabled={isLoading}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Resend invitation"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onRevoke && (
                            <button
                              onClick={() => onRevoke(invitation.id)}
                              disabled={isLoading}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Revoke invitation"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
