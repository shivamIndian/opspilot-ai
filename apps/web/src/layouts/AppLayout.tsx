import React, { useState, useEffect } from 'react';
import { useParams, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { organizationService } from '@/services/organizationService';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { Sidebar } from '@/navigation/Sidebar';
import { Topbar } from '@/navigation/Topbar';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { Button } from '@/components/ui/Button';

export const AppLayout: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { activeOrganization, setActiveOrganization } = useOrganizationStore();

  const [isLoading, setIsLoading] = useState(
    !activeOrganization || activeOrganization.id !== organizationId
  );
  const [error, setError] = useState<string | null>(null);

  // Desktop sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('opspilot_sidebar_collapsed') === 'true';
  });

  // Mobile drawer open state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Sync active organization with URL parameter
  useEffect(() => {
    if (!organizationId) return;

    if (activeOrganization && activeOrganization.id === organizationId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    organizationService
      .getOrganization(organizationId)
      .then(org => {
        if (isMounted) {
          setActiveOrganization(org);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg =
            (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
              ?.error?.message ||
            (err as Error).message ||
            'Unable to load organization workspace';
          setError(msg);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [organizationId, activeOrganization, setActiveOrganization]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('opspilot_sidebar_collapsed', String(next));
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-primary)] text-[var(--text-primary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        <p className="mt-3 text-xs text-[var(--text-secondary)] font-medium">
          Loading workspace...
        </p>
      </div>
    );
  }

  if (error || !activeOrganization) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-primary)] p-4 text-[var(--text-primary)]">
        <div className="max-w-md w-full rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-6 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--danger-text)]/10 text-[var(--danger-text)] mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">Workspace Unavailable</h2>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            {error || 'The requested organization could not be found or you do not have permission to access it.'}
          </p>
          <div className="mt-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/organizations')}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Return to Organizations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] flex">
      {/* Sidebar: Persistent desktop + mobile drawer */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex flex-1 flex-col transition-all duration-200 min-w-0 ${
          isCollapsed ? 'md:pl-16' : 'md:pl-60'
        }`}
      >
        <Topbar
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          isSidebarCollapsed={isCollapsed}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ErrorBoundary>
            <Outlet context={{ organization: activeOrganization }} />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
