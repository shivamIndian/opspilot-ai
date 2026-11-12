/**
 * Centralized Route Configuration and Path Helpers for OpsPilot AI Web
 */

export const ROUTES = {
  // Public Routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  ACCEPT_INVITATION: '/invitations/accept',
  FORBIDDEN: '/403',
  NOT_FOUND: '*',

  // Protected Account Routes
  DASHBOARD: '/dashboard',
  ORGANIZATIONS: '/organizations',
  CREATE_ORGANIZATION: '/organizations/new',

  // Organization Workspace Routes (Dynamic)
  WORKSPACE: (orgId: string) => `/organizations/${orgId}`,
  TICKETS: (orgId: string) => `/organizations/${orgId}/tickets`,
  NEW_TICKET: (orgId: string) => `/organizations/${orgId}/tickets/new`,
  TICKET_DETAILS: (orgId: string, ticketId: string) => `/organizations/${orgId}/tickets/${ticketId}`,
  DOCUMENTS: (orgId: string) => `/organizations/${orgId}/documents`,
  KNOWLEDGE_SEARCH: (orgId: string) => `/organizations/${orgId}/knowledge/search`,
  APPROVALS: (orgId: string) => `/organizations/${orgId}/approvals`,
  WORKFLOWS: (orgId: string) => `/organizations/${orgId}/agent/workflows`,
  MEMORY_SETTINGS: (orgId: string) => `/organizations/${orgId}/settings/ai-memory`,
  MEMBERS: (orgId: string) => `/organizations/${orgId}/members`,
  INVITATIONS: (orgId: string) => `/organizations/${orgId}/invitations`,
  ORG_SETTINGS: (orgId: string) => `/organizations/${orgId}/settings`,
} as const;

export interface RouteMetadata {
  path: string;
  title: string;
  requiresAuth: boolean;
  requiredRoles?: Array<'owner' | 'admin' | 'member' | 'viewer'>;
}

export const ROUTE_METADATA: Record<string, RouteMetadata> = {
  HOME: { path: '/', title: 'Home', requiresAuth: false },
  LOGIN: { path: '/login', title: 'Sign In', requiresAuth: false },
  REGISTER: { path: '/register', title: 'Create Account', requiresAuth: false },
  FORBIDDEN: { path: '/403', title: 'Access Denied', requiresAuth: false },
  DASHBOARD: { path: '/dashboard', title: 'User Dashboard', requiresAuth: true },
  ORGANIZATIONS: { path: '/organizations', title: 'Workspaces', requiresAuth: true },
};
