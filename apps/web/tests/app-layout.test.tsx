import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationSwitcher } from '@/navigation/OrganizationSwitcher';
import { UserProfileMenu } from '@/navigation/UserProfileMenu';
import { Sidebar } from '@/navigation/Sidebar';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ThemeProvider } from '@/providers/ThemeProvider';

describe('AppLayout Components', () => {
  beforeEach(() => {
    useOrganizationStore.setState({
      activeOrganization: {
        id: 'org-test-456',
        name: 'Nexus Ops',
        slug: 'nexus-ops',
        role: 'owner',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      organizations: [
        {
          id: 'org-test-456',
          name: 'Nexus Ops',
          slug: 'nexus-ops',
          role: 'owner',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'org-test-789',
          name: 'Cyberdyne Systems',
          slug: 'cyberdyne',
          role: 'admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
    });

    useAuthStore.setState({
      user: {
        id: 'usr-1',
        email: 'alice@nexus.ai',
        name: 'Alice Johnson',
        role: 'admin',
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe('OrganizationSwitcher', () => {
    it('displays active workspace name and opens dropdown list', () => {
      render(
        <MemoryRouter>
          <OrganizationSwitcher />
        </MemoryRouter>
      );

      // Active workspace displayed
      expect(screen.getByText('Nexus Ops')).toBeInTheDocument();
      expect(screen.getByText('/nexus-ops')).toBeInTheDocument();

      // Open dropdown
      const triggerBtn = screen.getByRole('button', { name: /switch organization/i });
      fireEvent.click(triggerBtn);

      expect(screen.getByText('Workspaces (2)')).toBeInTheDocument();
      expect(screen.getByText('Cyberdyne Systems')).toBeInTheDocument();
      expect(screen.getByText('Create New Organization')).toBeInTheDocument();
    });
  });

  describe('UserProfileMenu', () => {
    it('displays user initials and details on dropdown click', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <UserProfileMenu />
          </ThemeProvider>
        </MemoryRouter>
      );

      // User initials avatar button
      const avatarBtn = screen.getByRole('button', { name: /user account menu/i });
      expect(avatarBtn).toBeInTheDocument();
      expect(avatarBtn).toHaveTextContent('AJ');

      // Click to open
      fireEvent.click(avatarBtn);

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('alice@nexus.ai')).toBeInTheDocument();
      expect(screen.getByText('Personal Dashboard')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
    });
  });

  describe('Sidebar', () => {
    it('renders navigation links and handles collapse toggle', () => {
      const handleToggle = vi.fn();
      const handleCloseMobile = vi.fn();

      render(
        <MemoryRouter initialEntries={['/organizations/org-test-456']}>
          <Sidebar
            isCollapsed={false}
            onToggleCollapse={handleToggle}
            isMobileOpen={false}
            onCloseMobile={handleCloseMobile}
          />
        </MemoryRouter>
      );

      // Verify sections and items
      expect(screen.getAllByText('Workspace')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Overview')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Support Tickets')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Knowledge Base')[0]).toBeInTheDocument();
      expect(screen.queryByText('Documents')).toBeNull();
      expect(screen.getAllByText('AI Operations')[0]).toBeInTheDocument();
      expect(screen.getAllByText('AI Workflows')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Approval Inbox')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Agent Memory')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Administration')[0]).toBeInTheDocument();

      // Toggle collapse button
      const collapseBtn = screen.getAllByLabelText(/collapse sidebar/i)[0];
      fireEvent.click(collapseBtn);
      expect(handleToggle).toHaveBeenCalledTimes(1);
    });
  });
});
