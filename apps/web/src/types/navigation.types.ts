import type React from 'react';

export type NavigationSectionKey = 'WORKSPACE' | 'AI_OPERATIONS' | 'ADMINISTRATION';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: (orgId: string) => string;
  pattern: RegExp;
  section: NavigationSectionKey;
  allowedRoles?: Array<'owner' | 'admin' | 'member' | 'viewer'>;
  requiredPermission?: string;
  badge?: string | number;
  disabled?: boolean;
  comingSoon?: boolean;
}

export interface NavigationSection {
  key: NavigationSectionKey;
  title: string;
  items: NavigationItem[];
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isCurrent?: boolean;
}
