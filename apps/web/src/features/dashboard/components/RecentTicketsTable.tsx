import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket, ArrowUpRight } from 'lucide-react';
import type { DashboardRecentTicket } from '../types/dashboard.types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface RecentTicketsTableProps {
  organizationId: string;
  tickets: DashboardRecentTicket[];
}

export const RecentTicketsTable: React.FC<RecentTicketsTableProps> = ({
  organizationId,
  tickets,
}) => {
  const getPriorityVariant = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'danger' as const;
      case 'high':
        return 'warning' as const;
      case 'medium':
        return 'primary' as const;
      default:
        return 'neutral' as const;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return 'success' as const;
      case 'in_progress':
        return 'warning' as const;
      case 'waiting_on_customer':
        return 'info' as const;
      default:
        return 'primary' as const;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[var(--brand-primary)]" />
            <CardTitle>Recent Support Tickets</CardTitle>
          </div>
          <CardDescription>Latest customer inquiries and operational incidents</CardDescription>
        </div>
        <Link
          to={`/organizations/${organizationId}/tickets`}
          className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
        >
          <span>View All</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <div className="p-0">
        {tickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-y border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ticket</th>
                  <th className="px-4 py-2.5 font-medium">Subject</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Assignee</th>
                  <th className="px-4 py-2.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-[var(--surface-secondary)] transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-[var(--brand-primary)]">
                      <Link
                        to={`/organizations/${organizationId}/tickets/${t.id}`}
                        className="hover:underline"
                      >
                        {t.formattedTicketNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate font-medium text-[var(--text-primary)]">
                      <Link
                        to={`/organizations/${organizationId}/tickets/${t.id}`}
                        className="hover:underline"
                      >
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getPriorityVariant(t.priority)} size="sm">
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(t.status)} size="sm">
                        {t.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {t.assigneeName || <span className="italic text-[var(--text-tertiary)]">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-tertiary)]">
                      {new Date(t.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
            No support tickets recorded yet.
          </div>
        )}
      </div>
    </Card>
  );
};
