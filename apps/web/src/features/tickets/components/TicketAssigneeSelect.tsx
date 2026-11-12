import React from 'react';
import { UserX } from 'lucide-react';
import type { OrganizationMember } from '@/types/organization';

interface TicketAssigneeSelectProps {
  members: OrganizationMember[];
  currentAssigneeId: string | null;
  onAssign: (userId: string | null) => Promise<void>;
  disabled?: boolean;
}

export const TicketAssigneeSelect: React.FC<TicketAssigneeSelectProps> = ({
  members,
  currentAssigneeId,
  onAssign,
  disabled = false,
}) => {
  const activeMembers = members.filter(m => m.status === 'active');

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const targetUserId = val === '' ? null : val;
    await onAssign(targetUserId);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <select
          value={currentAssigneeId || ''}
          onChange={handleChange}
          disabled={disabled}
          className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition"
        >
          <option value="">Unassigned</option>
          {activeMembers.map(m => (
            <option key={m.userId} value={m.userId}>
              {m.name} ({m.role})
            </option>
          ))}
        </select>
      </div>
      {currentAssigneeId && !disabled && (
        <button
          type="button"
          onClick={() => onAssign(null)}
          title="Unassign"
          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition"
        >
          <UserX className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
