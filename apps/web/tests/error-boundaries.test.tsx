import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Module 25: Error Pages & Boundaries Suite', () => {
  describe('NotFoundPage (404)', () => {
    it('renders 404 message and home link', () => {
      render(
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/404 - Page Not Found/i)).toBeInTheDocument();
      expect(
        screen.getByText(/The requested page does not exist in the OpsPilot AI frontend workspace/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Return to Home/i })).toBeInTheDocument();
    });
  });

  describe('ForbiddenPage (403)', () => {
    it('renders access denied message and navigation buttons', () => {
      render(
        <MemoryRouter>
          <ForbiddenPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/403 Forbidden/i)).toBeInTheDocument();
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
      expect(
        screen.getByText(/You do not have sufficient permissions to view this resource/i)
      ).toBeInTheDocument();

      const goBackBtn = screen.getByRole('button', { name: /Go Back/i });
      fireEvent.click(goBackBtn);
      expect(mockNavigate).toHaveBeenCalledWith(-1);

      const dashboardBtn = screen.getByRole('button', { name: /Return to Dashboard/i });
      fireEvent.click(dashboardBtn);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
