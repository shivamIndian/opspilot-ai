import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Ticket,
  BookOpen,
  Workflow,
  ShieldCheck,
  BrainCircuit,
  Users,
  ArrowRight,
  Shield,
  Plus,
  Search,
  Upload,
  BarChart3,
  Bot,
} from 'lucide-react';
import type { SafeOrganization } from '@/types/organization';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export const WorkspaceOverviewPage: React.FC = () => {
  const context = useOutletContext<{ organization?: SafeOrganization }>();
  const organization = context?.organization;

  if (!organization) {
    return null;
  }

  const isOwner = organization.role === 'owner';
  const isAdmin = organization.role === 'admin' || isOwner;

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'warning' as const;
      case 'admin':
        return 'primary' as const;
      default:
        return 'neutral' as const;
    }
  };

  const capabilities = [
    {
      id: 'tickets',
      title: 'Support Tickets',
      description: 'Customer requests, automated triage, AI incident classification, and multi-tier resolution.',
      icon: Ticket,
      href: `/organizations/${organization.id}/tickets`,
      badge: 'Core Operations',
      badgeVariant: 'primary' as const,
    },
    {
      id: 'knowledge',
      title: 'Knowledge Base & Documents Hub',
      description: 'Unified enterprise document management, automated chunking, vector embeddings, and hybrid semantic retrieval.',
      icon: BookOpen,
      href: `/organizations/${organization.id}/knowledge`,
      badge: 'Unified RAG',
      badgeVariant: 'success' as const,
    },
    {
      id: 'workflows',
      title: 'AI Workflows',
      description: 'Stateful LangGraph agent workflows, tool execution orchestrations, and automated pipelines.',
      icon: Workflow,
      href: `/organizations/${organization.id}/agent/workflows`,
      badge: 'LangGraph',
      badgeVariant: 'warning' as const,
    },
    {
      id: 'approvals',
      title: 'Human-in-the-Loop Approvals',
      description: 'High-risk action gating, pending tool intervention review, and execution resumption.',
      icon: ShieldCheck,
      href: `/organizations/${organization.id}/approvals`,
      badge: 'Governance',
      badgeVariant: 'danger' as const,
    },
    {
      id: 'memory',
      title: 'Persistent Agent Memory',
      description: 'Cross-conversation user preferences, contextual facts, and semantic memory retention.',
      icon: BrainCircuit,
      href: `/organizations/${organization.id}/settings/ai-memory`,
      badge: 'Agent Context',
      badgeVariant: 'info' as const,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Workspace Header Hero */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 font-bold text-xl shadow-inner">
              {organization.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  {organization.name}
                </h1>
                <Badge variant={getRoleBadgeVariant(organization.role)}>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {(organization.role || 'member').toUpperCase()}
                  </span>
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                {organization.description ||
                  'Enterprise Agentic AI workspace with autonomous workflows, document RAG, and governance.'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-[var(--text-tertiary)]">
                <span>Slug: /{organization.slug}</span>
                <span>•</span>
                <span>Tenant ID: {organization.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/organizations/${organization.id}/chat`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors shadow-sm"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>AI Assistant</span>
            </Link>
            {isAdmin && (
              <Link
                to={`/organizations/${organization.id}/dashboard`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 px-3.5 py-2 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-colors shadow-sm"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Admin Dashboard</span>
              </Link>
            )}
            <Link
              to={`/organizations/${organization.id}/tickets/new`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--brand-primary-hover)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Ticket</span>
            </Link>
            <Link
              to={`/organizations/${organization.id}/knowledge`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <span>Knowledge Hub</span>
            </Link>
            <Link
              to={`/organizations/${organization.id}/knowledge/search`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <span>RAG Search</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Capabilities Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Operations & AI Engines
          </h2>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {capabilities.length} Active Modules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map(cap => {
            const Icon = cap.icon;
            return (
              <Link
                key={cap.id}
                to={cap.href}
                className="group block transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none"
              >
                <Card className="h-full border-[var(--border-default)] bg-[var(--surface-secondary)] transition-all hover:border-[var(--brand-primary)]/50 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge variant={cap.badgeVariant} size="sm">
                        {cap.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors flex items-center justify-between mt-2">
                      <span>{cap.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-[var(--brand-primary)]" />
                    </CardTitle>
                    <CardDescription className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {cap.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Administration & Security Banner (for Admins / Owners) */}
      {isAdmin && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Administration & Workspace Management
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to={`/organizations/${organization.id}/members`}
              className="group flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                  <Users className="h-4 w-4 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Workspace Members
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Manage member access, assign roles, and remove users
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
            </Link>

            <Link
              to={`/organizations/${organization.id}/invitations`}
              className="group flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Invitations & Security
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Send invitations, track pending tokens, and view policies
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
