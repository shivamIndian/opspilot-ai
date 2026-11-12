import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import type { BreadcrumbItem } from '@/types/navigation.types';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const { organizationId } = useParams<{ organizationId?: string }>();
  const activeOrganization = useOrganizationStore(s => s.activeOrganization);

  const breadcrumbs = React.useMemo((): BreadcrumbItem[] => {
    const path = location.pathname;
    const items: BreadcrumbItem[] = [];

    // If inside an organization context
    if (organizationId) {
      const orgName = activeOrganization?.name || 'Organization';
      items.push({
        label: orgName,
        path: `/organizations/${organizationId}`,
      });

      if (path.includes('/tickets/new')) {
        items.push({ label: 'Support Tickets', path: `/organizations/${organizationId}/tickets` });
        items.push({ label: 'Create Ticket', isCurrent: true });
      } else if (path.includes('/tickets/')) {
        items.push({ label: 'Support Tickets', path: `/organizations/${organizationId}/tickets` });
        items.push({ label: 'Ticket Details', isCurrent: true });
      } else if (path.endsWith('/tickets')) {
        items.push({ label: 'Support Tickets', isCurrent: true });
      } else if (path.includes('/documents')) {
        items.push({ label: 'Documents', isCurrent: true });
      } else if (path.includes('/knowledge')) {
        items.push({ label: 'Knowledge Base', isCurrent: true });
      } else if (path.includes('/approvals')) {
        items.push({ label: 'Approval Inbox', isCurrent: true });
      } else if (path.includes('/settings/ai-memory') || path.includes('/agent/memory')) {
        items.push({ label: 'Settings', path: `/organizations/${organizationId}/settings` });
        items.push({ label: 'Agent Memory', isCurrent: true });
      } else if (path.includes('/agent/workflows')) {
        items.push({ label: 'AI Operations', path: `/organizations/${organizationId}/agent/workflows` });
        items.push({ label: 'Workflows', isCurrent: true });
      } else if (path.endsWith('/members')) {
        items.push({ label: 'Members', isCurrent: true });
      } else if (path.endsWith('/invitations')) {
        items.push({ label: 'Invitations', isCurrent: true });
      } else if (path.endsWith('/settings')) {
        items.push({ label: 'Organization Settings', isCurrent: true });
      } else {
        // Overview
        items[0].isCurrent = true;
      }
    } else if (path === '/dashboard') {
      items.push({ label: 'Personal Dashboard', isCurrent: true });
    } else if (path === '/organizations') {
      items.push({ label: 'Organizations', isCurrent: true });
    } else if (path === '/organizations/new') {
      items.push({ label: 'Organizations', path: '/organizations' });
      items.push({ label: 'New Organization', isCurrent: true });
    }

    return items;
  }, [location.pathname, organizationId, activeOrganization]);

  if (breadcrumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-500 dark:text-slate-400">
      <Link
        to={organizationId ? `/organizations/${organizationId}` : '/dashboard'}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded"
        title="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {breadcrumbs.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-300 dark:text-slate-600 shrink-0" />
          {item.isCurrent || !item.path ? (
            <span
              aria-current={item.isCurrent ? 'page' : undefined}
              className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]"
            >
              {item.label}
            </span>
          ) : (
            <Link
              to={item.path}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors truncate max-w-[150px]"
            >
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
