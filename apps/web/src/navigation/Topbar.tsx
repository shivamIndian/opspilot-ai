import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { UserProfileMenu } from './UserProfileMenu';
import { Breadcrumbs } from './Breadcrumbs';
import { useTheme } from '@/providers/ThemeProvider';

export interface TopbarProps {
  onOpenMobileMenu: () => void;
  isSidebarCollapsed?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileMenu,
}) => {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header
      className={`sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-primary)]/80 px-4 backdrop-blur-md transition-all duration-200 md:px-6`}
    >
      {/* Left section: mobile hamburger, org switcher, breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <OrganizationSwitcher />

        <div className="hidden lg:flex items-center pl-2 border-l border-[var(--border-subtle)]">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right section: theme quick toggle, user profile menu */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <div className="h-4 w-px bg-[var(--border-subtle)] mx-1" />

        <UserProfileMenu />
      </div>
    </header>
  );
};
