import React, { useState } from 'react';
import type { OrganizationRole } from '@/types/organization';
import { Mail, Shield, UserCheck, X, Loader2, AlertCircle } from 'lucide-react';

export const InviteMemberDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: 'admin' | 'member') => Promise<void>;
  actorRole?: OrganizationRole;
}> = ({ isOpen, onClose, onInvite, actorRole }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) return;

    setIsLoading(true);
    try {
      await onInvite(email, role);
      setEmail('');
      setRole('member');
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to send invitation';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Invite Team Member</h2>
              <p className="text-xs text-slate-400">Send an invitation to join this workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Organization Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('member')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  role === 'member'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-xs mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Member</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Standard member access to permitted workspaces
                </p>
              </button>

              {actorRole === 'owner' ? (
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === 'admin'
                      ? 'bg-purple-600/20 border-purple-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs mb-1">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Admin</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Manage members and organization settings
                  </p>
                </button>
              ) : (
                <div className="p-3 rounded-xl border border-slate-800/40 bg-slate-950/30 text-slate-600 opacity-60">
                  <div className="flex items-center gap-1.5 font-medium text-xs mb-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </div>
                  <p className="text-[10px]">Only owners can invite administrators</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send Invitation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
