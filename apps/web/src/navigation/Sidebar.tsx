import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import type { NavigationItem } from '@/types/navigation.types';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { sections, activeOrganization, isPathActive } = useNavigation();

  if (!activeOrganization) {
    return null;
  }

  const renderNavItem = (item: NavigationItem) => {
    const href = item.href(activeOrganization.id);
    const isActive = isPathActive(item);
    const Icon = item.icon;

    const linkContent = (
      <NavLink
        to={href}
        onClick={() => {
          if (isMobileOpen) onCloseMobile();
        }}
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
          isActive
            ? 'bg-[var(--brand-primary)] text-white shadow-sm'
            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
        } ${isCollapsed ? 'justify-center px-2' : ''}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon
          className={`h-4 w-4 flex-shrink-0 transition-transform ${
            isActive ? 'text-white' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'
          }`}
        />

        {!isCollapsed && (
          <span className="truncate flex-1">{item.label}</span>
        )}

        {!isCollapsed && item.badge !== undefined && (
          <Badge
            variant={isActive ? 'neutral' : 'primary'}
            size="sm"
            className={isActive ? 'bg-white/20 text-white border-transparent' : ''}
          >
            {item.badge}
          </Badge>
        )}

        {isCollapsed && item.badge !== undefined && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--brand-primary)] ring-2 ring-[var(--surface-secondary)]" />
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.id} content={item.label} position="right">
          {linkContent}
        </Tooltip>
      );
    }

    return <div key={item.id}>{linkContent}</div>;
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto overflow-x-hidden p-3">
      {/* Brand & Nav Items */}
      <div className="space-y-6">
        {/* Brand header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--brand-primary)] to-indigo-400 text-white shadow-md">
              <Bot className="h-4 w-4" />
            </div>
            {!isCollapsed && (
              <div>
                <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                  OpsPilot <span className="text-[var(--brand-primary)]">AI</span>
                </span>
                <span className="block text-[9px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                  Enterprise Platform
                </span>
              </div>
            )}
          </div>

          {/* Close button for mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-5" aria-label="Main Navigation">
          {sections.map(section => (
            <div key={section.key} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {section.title}
                </p>
              )}
              {isCollapsed && (
                <div className="my-2 border-t border-[var(--border-subtle)] mx-2" />
              )}
              <div className="space-y-0.5">{section.items.map(renderNavItem)}</div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / Collapse Toggle on Desktop */}
      <div className="border-t border-[var(--border-subtle)] pt-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`hidden md:flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          role="presentation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-[var(--surface-secondary)] border-r border-[var(--border-default)] transition-transform duration-200 ease-in-out md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation"
      >
        {navContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:block fixed inset-y-0 left-0 z-30 transform border-r border-[var(--border-default)] bg-[var(--surface-secondary)] transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
        aria-label="Desktop Navigation"
      >
        {navContent}
      </aside>
    </>
  );
};
