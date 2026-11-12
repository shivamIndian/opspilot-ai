import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { NotificationProvider, useNotifications } from '@/providers/NotificationProvider';

const ThemeConsumer = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

const NotificationConsumer = () => {
  const { toast } = useNotifications();
  return (
    <div>
      <button onClick={() => toast.success('Operation Successful', 'All items synced')}>
        Trigger Success
      </button>
      <button onClick={() => toast.error('Operation Failed', 'Network unreachable')}>
        Trigger Error
      </button>
    </div>
  );
};

describe('Global Application Providers', () => {
  describe('ThemeProvider', () => {
    beforeEach(() => {
      localStorage.clear();
      document.documentElement.classList.remove('dark');
    });

    afterEach(() => {
      localStorage.clear();
      document.documentElement.classList.remove('dark');
    });

    it('manages theme state and updates documentElement classes and localStorage', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      // Set light
      fireEvent.click(screen.getByText('Set Light'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('opspilot_theme')).toBe('light');

      // Set dark
      fireEvent.click(screen.getByText('Set Dark'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('opspilot_theme')).toBe('dark');

      // Toggle back to light
      fireEvent.click(screen.getByText('Toggle'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('NotificationProvider', () => {
    it('dispatches and displays toast notifications', () => {
      render(
        <NotificationProvider>
          <NotificationConsumer />
        </NotificationProvider>
      );

      fireEvent.click(screen.getByText('Trigger Success'));

      expect(screen.getByText('Operation Successful')).toBeInTheDocument();
      expect(screen.getByText('All items synced')).toBeInTheDocument();

      // Trigger error
      fireEvent.click(screen.getByText('Trigger Error'));
      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
      expect(screen.getByText('Network unreachable')).toBeInTheDocument();
    });

    it('allows manual dismissal of toasts', () => {
      render(
        <NotificationProvider>
          <NotificationConsumer />
        </NotificationProvider>
      );

      fireEvent.click(screen.getByText('Trigger Success'));
      expect(screen.getByText('Operation Successful')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText('Close notification');
      fireEvent.click(closeBtn);

      expect(screen.queryByText('Operation Successful')).not.toBeInTheDocument();
    });
  });
});
