import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NAVIGATION_CONFIG } from '@/navigation/navigation.config';
import { Breadcrumbs } from '@/navigation/Breadcrumbs';
import { useOrganizationStore } from '@/store/useOrganizationStore';

describe('Navigation System', () => {
  describe('NAVIGATION_CONFIG', () => {
    it('defines the three core navigation sections', () => {
      const sectionKeys = NAVIGATION_CONFIG.map(s => s.key);
      expect(sectionKeys).toEqual(['WORKSPACE', 'AI_OPERATIONS', 'ADMINISTRATION']);
    });

    it('protects administration routes with owner and admin roles', () => {
      const adminSection = NAVIGATION_CONFIG.find(s => s.key === 'ADMINISTRATION');
      expect(adminSection).toBeDefined();

      adminSection?.items.forEach(item => {
        expect(item.allowedRoles).toEqual(['owner', 'admin']);
      });
    });

    it('ensures workspace and AI operation routes are accessible by default', () => {
      const workspaceSection = NAVIGATION_CONFIG.find(s => s.key === 'WORKSPACE');
      workspaceSection?.items.forEach(item => {
        expect(item.allowedRoles).toBeUndefined();
      });

      const aiSection = NAVIGATION_CONFIG.find(s => s.key === 'AI_OPERATIONS');
      aiSection?.items.forEach(item => {
        expect(item.allowedRoles).toBeUndefined();
      });
    });

    it('generates correct route patterns for items', () => {
      const ticketsItem = NAVIGATION_CONFIG[0].items.find(i => i.id === 'workspace-tickets');
      expect(ticketsItem?.href('org-123')).toBe('/organizations/org-123/tickets');
      expect(ticketsItem?.pattern.test('/organizations/org-123/tickets')).toBe(true);

      const approvalsItem = NAVIGATION_CONFIG[1].items.find(i => i.id === 'ai-approvals');
      expect(approvalsItem?.href('org-123')).toBe('/organizations/org-123/approvals');
      expect(approvalsItem?.pattern.test('/organizations/org-123/approvals')).toBe(true);
    });
  });

  describe('Breadcrumbs Component', () => {
    it('renders breadcrumbs for tickets page inside an organization context', () => {
      useOrganizationStore.setState({
        activeOrganization: {
          id: 'org-test-1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          role: 'member',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      render(
        <MemoryRouter initialEntries={['/organizations/org-test-1/tickets']}>
          <Routes>
            <Route path="/organizations/:organizationId/*" element={<Breadcrumbs />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Support Tickets')).toBeInTheDocument();
    });

    it('renders breadcrumbs for top-level dashboard', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<Breadcrumbs />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Personal Dashboard')).toBeInTheDocument();
    });
  });
});
