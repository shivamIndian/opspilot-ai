import React, { useState } from 'react';
import type { OrganizationMember } from '@/types/organization';
import { Crown, AlertTriangle, X, Loader2, AlertCircle } from 'lucide-react';

export const TransferOwnershipDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  members: OrganizationMember[];
  currentUserId: string;
  onTransfer: (newOwnerUserId: string) => Promise<void>;
}> = ({ isOpen, onClose, members, currentUserId, onTransfer }) => {
  const eligibleMembers = members.filter(m => m.userId !== currentUserId && m.status === 'active');

  const [selectedUserId, setSelectedUserId] = useState<string>(eligibleMembers[0]?.userId || '');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationInput !== 'TRANSFER') {
      setError('Please type TRANSFER in uppercase to confirm.');
      return;
    }
    if (!selectedUserId) {
      setError('Please select an eligible member.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onTransfer(selectedUserId);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to transfer ownership';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600/20 border border-amber-500/30 rounded-xl text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Transfer Organization Ownership</h2>
              <p className="text-xs text-slate-400">Permanently assign primary owner privileges</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3 leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="font-semibold text-amber-200 mb-0.5">Critical Action:</p>
            You are transferring primary ownership of this organization. Upon completion, your role
            will automatically become <span className="font-bold underline">Admin</span>, and the
            selected member will assume full Owner privileges.
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {eligibleMembers.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
            There are no other active members in this organization to transfer ownership to. Please
            invite another team member first.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Select New Owner</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {eligibleMembers.map(member => (
                  <option key={member.userId} value={member.userId}>
                    {member.name} ({member.email}) — current: {member.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Type <span className="font-mono font-bold text-amber-400">TRANSFER</span> to confirm
              </label>
              <input
                type="text"
                required
                value={confirmationInput}
                onChange={e => setConfirmationInput(e.target.value)}
                placeholder="TRANSFER"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors font-mono"
              />
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
                disabled={isLoading || confirmationInput !== 'TRANSFER'}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Transferring...</span>
                  </>
                ) : (
                  <span>Confirm Ownership Transfer</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
