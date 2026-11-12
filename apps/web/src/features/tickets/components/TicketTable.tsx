import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Inbox, ArrowUpDown } from 'lucide-react';
import type { SafeTicket } from '../types/ticket.types';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { CATEGORY_LABELS, formatRelativeTime } from '../utils/ticket-formatters';

interface TicketTableProps {
  organizationId: string;
  tickets: SafeTicket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onSortChange: (
    sortBy: 'created_at' | 'updated_at' | 'ticket_number' | 'priority' | 'status'
  ) => void;
}

export const TicketTable: React.FC<TicketTableProps> = ({
  organizationId,
  tickets,
  pagination,
  isLoading,
  onPageChange,
  onSortChange,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
          No tickets found
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
          There are no tickets matching your current filters, or your organization has not created
          any tickets yet.
        </p>
        <button
          onClick={() => navigate(`/organizations/${organizationId}/tickets/new`)}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
        >
          Create New Ticket
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th
                onClick={() => onSortChange('ticket_number')}
                className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300"
              >
                <div className="flex items-center gap-1">
                  Ticket #
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Subject & Category</th>
              <th
                onClick={() => onSortChange('priority')}
                className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300"
              >
                <div className="flex items-center gap-1">
                  Priority
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => onSortChange('status')}
                className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300"
              >
                <div className="flex items-center gap-1">
                  Status
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Assignee</th>
              <th
                onClick={() => onSortChange('created_at')}
                className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300"
              >
                <div className="flex items-center gap-1">
                  Created
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
            {tickets.map(ticket => (
              <tr
                key={ticket.id}
                onClick={() => navigate(`/organizations/${organizationId}/tickets/${ticket.id}`)}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                {/* Ticket Number */}
                <td className="py-3.5 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                  {ticket.formattedTicketNumber}
                </td>

                {/* Subject & Category */}
                <td className="py-3.5 px-4 max-w-md">
                  <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {ticket.subject}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {CATEGORY_LABELS[ticket.category]}
                  </div>
                </td>

                {/* Priority */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <TicketPriorityBadge priority={ticket.priority} />
                </td>

                {/* Status */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <TicketStatusBadge status={ticket.status} />
                </td>

                {/* Assignee */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {ticket.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-semibold">
                        {ticket.assignee.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {ticket.assignee.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                  )}
                </td>

                {/* Created Date */}
                <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatRelativeTime(ticket.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing page{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {pagination.page}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {pagination.totalPages}
            </span>{' '}
            ({pagination.total} total)
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
