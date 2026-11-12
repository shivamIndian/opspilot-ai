import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, useNavigate } from 'react-router-dom';
import { useOrganizations } from '@/hooks/useOrganizations';
import { RootLayout } from '@/layouts/RootLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

// Loading fallback component during dynamic chunk loading
const RouteLoadingFallback = () => (
  <div className="flex min-h-[50vh] w-full flex-col items-center justify-center space-y-3">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
    <span className="text-xs text-slate-400 animate-pulse">Loading view...</span>
  </div>
);

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<RouteLoadingFallback />}>
    <Component />
  </Suspense>
);

// Intelligent organization-scoped redirect helper for friendly top-level route aliases
const WorkspaceRedirect: React.FC<{ subpath?: string }> = ({ subpath = 'dashboard' }) => {
  const { organizations, activeOrganization, fetchOrganizations, isLoading } = useOrganizations();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (organizations.length === 0 && !isLoading) {
      fetchOrganizations().catch(console.error);
    }
  }, [organizations.length, isLoading, fetchOrganizations]);

  React.useEffect(() => {
    const target = activeOrganization || (organizations.length > 0 ? organizations[0] : null);
    if (target) {
      const destination = subpath ? `/organizations/${target.id}/${subpath}` : `/organizations/${target.id}`;
      navigate(destination, { replace: true });
    } else if (!isLoading && organizations.length === 0) {
      navigate('/organizations/new', { replace: true });
    }
  }, [activeOrganization, organizations, isLoading, navigate, subpath]);

  return <RouteLoadingFallback />;
};

// Lazy-loaded core authenticated pages for route-level code splitting & bundle optimization
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const WorkspaceOverviewPage = lazy(() => import('@/pages/WorkspaceOverviewPage').then(m => ({ default: m.WorkspaceOverviewPage })));
const ApprovalsPage = lazy(() => import('@/pages/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })));
const WorkflowsPage = lazy(() => import('@/pages/WorkflowsPage').then(m => ({ default: m.WorkflowsPage })));

const OrganizationsPage = lazy(() => import('@/features/organizations/pages/OrganizationsPage').then(m => ({ default: m.OrganizationsPage })));
const CreateOrganizationPage = lazy(() => import('@/features/organizations/pages/CreateOrganizationPage').then(m => ({ default: m.CreateOrganizationPage })));
const OrganizationMembersPage = lazy(() => import('@/features/organizations/pages/OrganizationMembersPage').then(m => ({ default: m.OrganizationMembersPage })));
const OrganizationInvitationsPage = lazy(() => import('@/features/organizations/pages/OrganizationInvitationsPage').then(m => ({ default: m.OrganizationInvitationsPage })));
const OrganizationSettingsPage = lazy(() => import('@/features/organizations/pages/OrganizationSettingsPage').then(m => ({ default: m.OrganizationSettingsPage })));
const AcceptInvitationPage = lazy(() => import('@/features/organizations/pages/AcceptInvitationPage').then(m => ({ default: m.AcceptInvitationPage })));

const TicketsPage = lazy(() => import('@/features/tickets/pages/TicketsPage').then(m => ({ default: m.TicketsPage })));
const CreateTicketPage = lazy(() => import('@/features/tickets/pages/CreateTicketPage').then(m => ({ default: m.CreateTicketPage })));
const TicketDetailsPage = lazy(() => import('@/features/tickets/pages/TicketDetailsPage').then(m => ({ default: m.TicketDetailsPage })));

const DocumentDetailPage = lazy(() => import('@/features/documents/pages/DocumentDetailPage').then(m => ({ default: m.DocumentDetailPage })));
const KnowledgeBasePage = lazy(() => import('@/features/knowledge/pages/KnowledgeBasePage').then(m => ({ default: m.KnowledgeBasePage })));
const MemorySettingsPage = lazy(() => import('@/features/agent-memory/pages/MemorySettingsPage').then(m => ({ default: m.MemorySettingsPage })));
const AdminDashboardPage = lazy(() => import('@/features/dashboard/pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage').then(m => ({ default: m.ChatPage })));

const ApprovalDetailPage = lazy(() => import('@/features/agent-approvals/pages/ApprovalDetailPage').then(m => ({ default: m.ApprovalDetailPage })));
const AgentMonitoringPage = lazy(() => import('@/features/agent-monitoring').then(m => ({ default: m.AgentMonitoringPage })));
const WorkflowRunDetailPage = lazy(() => import('@/features/agent-monitoring').then(m => ({ default: m.WorkflowRunDetailPage })));
const AIEvaluationPage = lazy(() => import('@/features/ai-evaluation').then(m => ({ default: m.AIEvaluationPage })));
const EvaluationRunDetailPage = lazy(() => import('@/features/ai-evaluation').then(m => ({ default: m.EvaluationRunDetailPage })));

export const router = createBrowserRouter([
  // Public Pages (using marketing / standard RootLayout)
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        element: <PublicRoute />,
        children: [
          {
            path: 'login',
            element: <LoginPage />,
          },
          {
            path: 'register',
            element: <RegisterPage />,
          },
          {
            path: 'forgot-password',
            element: <ForgotPasswordPage />,
          },
          {
            path: 'reset-password',
            element: <ResetPasswordPage />,
          },
        ],
      },
      {
        path: 'verify-email',
        element: <VerifyEmailPage />,
      },
      {
        path: 'invitations/accept',
        element: withSuspense(AcceptInvitationPage),
      },
      {
        path: '403',
        element: <ForbiddenPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: withSuspense(DashboardPage),
          },
          {
            path: 'admin/dashboard',
            element: <WorkspaceRedirect subpath="dashboard" />,
          },
          {
            path: 'app',
            element: <WorkspaceRedirect subpath="" />,
          },
          {
            path: 'tickets',
            element: <WorkspaceRedirect subpath="tickets" />,
          },
          {
            path: 'tickets/new',
            element: <WorkspaceRedirect subpath="tickets/new" />,
          },
          {
            path: 'knowledge',
            element: <WorkspaceRedirect subpath="knowledge" />,
          },
          {
            path: 'documents',
            element: <WorkspaceRedirect subpath="documents" />,
          },
          {
            path: 'chat',
            element: <WorkspaceRedirect subpath="chat" />,
          },
          {
            path: 'approvals',
            element: <WorkspaceRedirect subpath="approvals" />,
          },
          {
            path: 'agent-monitoring',
            element: <WorkspaceRedirect subpath="agent-monitoring" />,
          },
          {
            path: 'monitoring',
            element: <WorkspaceRedirect subpath="agent-monitoring" />,
          },
          {
            path: 'ai-evaluation',
            element: <WorkspaceRedirect subpath="ai-evaluation" />,
          },
          {
            path: 'evaluation',
            element: <WorkspaceRedirect subpath="ai-evaluation" />,
          },
          {
            path: 'organizations',
            element: withSuspense(OrganizationsPage),
          },
          {
            path: 'organizations/new',
            element: withSuspense(CreateOrganizationPage),
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },

  // Authenticated Organization Workspace (using Unified Enterprise AppLayout)
  {
    path: '/organizations/:organizationId',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: withSuspense(WorkspaceOverviewPage),
      },
      {
        path: 'dashboard',
        element: withSuspense(AdminDashboardPage),
      },
      {
        path: 'tickets',
        element: withSuspense(TicketsPage),
      },
      {
        path: 'tickets/new',
        element: withSuspense(CreateTicketPage),
      },
      {
        path: 'tickets/:ticketId',
        element: withSuspense(TicketDetailsPage),
      },
      {
        path: 'knowledge',
        element: withSuspense(KnowledgeBasePage),
      },
      {
        path: 'knowledge/documents/:documentId',
        element: withSuspense(DocumentDetailPage),
      },
      {
        path: 'documents',
        element: <Suspense fallback={<RouteLoadingFallback />}><KnowledgeBasePage defaultTab="documents" /></Suspense>,
      },
      {
        path: 'documents/:documentId',
        element: withSuspense(DocumentDetailPage),
      },
      {
        path: 'knowledge/search',
        element: <Suspense fallback={<RouteLoadingFallback />}><KnowledgeBasePage defaultTab="search" /></Suspense>,
      },
      {
        path: 'chat',
        element: withSuspense(ChatPage),
      },
      {
        path: 'approvals',
        element: withSuspense(ApprovalsPage),
      },
      {
        path: 'approvals/:approvalId',
        element: withSuspense(ApprovalDetailPage),
      },
      {
        path: 'agent-monitoring',
        element: withSuspense(AgentMonitoringPage),
      },
      {
        path: 'agent-monitoring/runs/:runId',
        element: withSuspense(WorkflowRunDetailPage),
      },
      {
        path: 'ai-evaluation',
        element: withSuspense(AIEvaluationPage),
      },
      {
        path: 'ai-evaluation/runs/:runId',
        element: withSuspense(EvaluationRunDetailPage),
      },
      {
        path: 'agent/workflows',
        element: withSuspense(WorkflowsPage),
      },
      {
        path: 'settings/ai-memory',
        element: withSuspense(MemorySettingsPage),
      },
      {
        path: 'members',
        element: withSuspense(OrganizationMembersPage),
      },
      {
        path: 'invitations',
        element: withSuspense(OrganizationInvitationsPage),
      },
      {
        path: 'settings',
        element: withSuspense(OrganizationSettingsPage),
      },
    ],
  },
]);
