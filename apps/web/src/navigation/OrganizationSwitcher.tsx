import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown, Plus, Settings } from 'lucide-react';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { invalidateOrganizationQueries } from '@/app/query-client';
import { Badge } from '@/components/ui/Badge';
import type { SafeOrganization } from '@/types/organization';

export interface OrganizationSwitcherProps {
  className?: string;
  isCollapsed?: boolean;
}

export const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  className = '',
  isCollapsed = false,
}) => {
  const navigate = useNavigate();
  const { organizations, activeOrganization, setActiveOrganization, fetchOrganizations } =
    useOrganizationStore();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch organizations on mount if empty
  useEffect(() => {
    if (organizations.length === 0) {
      fetchOrganizations().catch(console.error);
    }
  }, [organizations.length, fetchOrganizations]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectOrg = (org: SafeOrganization) => {
    if (activeOrganization?.id === org.id) {
      setIsOpen(false);
      return;
    }

    // Invalidate queries to prevent stale data cross-contamination
    if (activeOrganization) {
      invalidateOrganizationQueries(activeOrganization.id);
    }

    setActiveOrganization(org);
    setIsOpen(false);
    navigate(`/organizations/${org.id}`);
  };

  const getRoleVariant = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'warning' as const;
      case 'admin':
        return 'primary' as const;
      default:
        return 'neutral' as const;
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Switch organization"
        className={`flex items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-1.5 text-left transition-colors hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
          isCollapsed ? 'justify-center p-2' : 'w-full min-w-[200px] max-w-[280px]'
        }`}
      >
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-semibold text-xs border border-[var(--brand-primary)]/20">
          {activeOrganization?.name ? (
            activeOrganization.name.charAt(0).toUpperCase()
          ) : (
            <Building2 className="h-4 w-4" />
          )}
        </div>

        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                  {activeOrganization?.name || 'Select Workspace'}
                </span>
                {activeOrganization?.role && (
                  <Badge variant={getRoleVariant(activeOrganization.role)} size="sm">
                    {activeOrganization.role}
                  </Badge>
                )}
              </div>
              <p className="truncate text-[10px] text-[var(--text-tertiary)] font-mono">
                {activeOrganization ? `/${activeOrganization.slug}` : 'No active org'}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)] transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 mt-1.5 w-72 origin-top-left rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Workspaces ({organizations.length})
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {organizations.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[var(--text-secondary)]">
                No organizations found
              </div>
            ) : (
              organizations.map(org => {
                const isSelected = activeOrganization?.id === org.id;
                return (
                  <button
                    key={org.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOrg(org)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium'
                        : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[11px] font-bold">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{org.name}</p>
                        <p className="truncate text-[10px] text-[var(--text-tertiary)] font-mono">
                          /{org.slug}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {org.role && (
                        <Badge variant={getRoleVariant(org.role)} size="sm">
                          {org.role}
                        </Badge>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 text-[var(--brand-primary)]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-1.5 border-t border-[var(--border-subtle)] pt-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/organizations/new');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Organization</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/organizations');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Manage Organizations</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
