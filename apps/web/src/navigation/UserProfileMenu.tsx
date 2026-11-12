import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Sun,
  Moon,
  Laptop,
  LayoutDashboard,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/providers/ThemeProvider';
import { Badge } from '@/components/ui/Badge';

export interface UserProfileMenuProps {
  className?: string;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
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

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'OP';
  };

  const initials = getInitials(user?.name, user?.email);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User account menu"
        className="flex items-center gap-2 rounded-full p-1 text-left transition-colors hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/30 text-xs font-bold text-[var(--brand-primary)] shadow-sm">
          {initials}
        </div>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* User Info Header */}
          <div className="px-2.5 py-2 border-b border-[var(--border-subtle)] pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/15 text-xs font-bold text-[var(--brand-primary)]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                  {user?.name || 'Authorized User'}
                </p>
                <p className="truncate text-[11px] text-[var(--text-tertiary)]">{user?.email}</p>
              </div>
            </div>
            {user?.role && (
              <div className="mt-2 flex items-center gap-1.5">
                <Badge variant="primary" size="sm">
                  {user.role}
                </Badge>
              </div>
            )}
          </div>

          {/* Account Links */}
          <div className="py-1 border-b border-[var(--border-subtle)]">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate('/dashboard');
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Personal Dashboard</span>
              </div>
              <ChevronRight className="h-3 w-3 text-[var(--text-tertiary)]" />
            </button>
          </div>

          {/* Theme Switcher */}
          <div className="py-2 border-b border-[var(--border-subtle)] px-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              Appearance
            </p>
            <div className="grid grid-cols-3 gap-1 bg-[var(--surface-primary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded text-[11px] font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Light Theme"
              >
                <Sun className="h-3 w-3" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded text-[11px] font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Dark Theme"
              >
                <Moon className="h-3 w-3" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded text-[11px] font-medium transition-colors ${
                  theme === 'system'
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="System Theme"
              >
                <Laptop className="h-3 w-3" />
                <span>Auto</span>
              </button>
            </div>
          </div>

          {/* Sign Out */}
          <div className="pt-1">
            <button
              type="button"
              role="menuitem"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--danger-text)] hover:bg-[var(--danger-bg)] transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
