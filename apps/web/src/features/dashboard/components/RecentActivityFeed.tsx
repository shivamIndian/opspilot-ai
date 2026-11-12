import React from 'react';
import { Activity, User, FileText, Ticket, ShieldCheck, Mail } from 'lucide-react';
import type { DashboardRecentActivity } from '../types/dashboard.types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface RecentActivityFeedProps {
  activity: DashboardRecentActivity[];
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ activity }) => {
  const getActionIcon = (action: string) => {
    if (action.startsWith('ticket.')) return Ticket;
    if (action.startsWith('document.')) return FileText;
    if (action.startsWith('member.')) return User;
    if (action.startsWith('invitation.')) return Mail;
    if (action.startsWith('agent.')) return ShieldCheck;
    return Activity;
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            <CardTitle>Organization Audit Stream</CardTitle>
          </div>
          <CardDescription>Immutable log of administrative, ticket, and document events</CardDescription>
        </div>
      </CardHeader>

      <div className="p-0">
        {activity.length > 0 ? (
          <div className="divide-y divide-[var(--border-default)]">
            {activity.map((item) => {
              const ActionIcon = getActionIcon(item.action);
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3.5 hover:bg-[var(--surface-secondary)] transition-colors text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)] mt-0.5">
                      <ActionIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {item.actorName}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {item.action}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {item.targetType && (
                          <span className="capitalize">
                            Target: {item.targetType} {item.targetId ? `(${item.targetId.slice(0, 8)}...)` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
            No organizational audit logs recorded yet.
          </div>
        )}
      </div>
    </Card>
  );
};
