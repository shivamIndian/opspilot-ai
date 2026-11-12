import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Inbox } from 'lucide-react';

describe('UI Component Library', () => {
  describe('Button', () => {
    it('renders text and handles click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const btn = screen.getByRole('button', { name: /click me/i });
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders loading state and disables interactions', () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Submit Action
        </Button>
      );

      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();

      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('supports button variants and sizes', () => {
      const { rerender } = render(<Button variant="danger">Delete</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-rose-600');

      rerender(<Button variant="outline" size="sm">Small Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('border');
    });
  });

  describe('Input', () => {
    it('renders label, input, and triggers onChange', () => {
      const handleChange = vi.fn();
      render(
        <Input
          label="Email Address"
          placeholder="user@example.com"
          onChange={handleChange}
        />
      );

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      const input = screen.getByPlaceholderText('user@example.com');
      fireEvent.change(input, { target: { value: 'test@ops.ai' } });

      expect(handleChange).toHaveBeenCalled();
    });

    it('renders error message and helper text when provided', () => {
      render(
        <Input
          label="Password"
          error="Password must be at least 8 characters"
          helperText="Use a strong password"
        />
      );

      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Badge', () => {
    it('renders children with appropriate variants', () => {
      const { rerender } = render(<Badge variant="success">Completed</Badge>);
      expect(screen.getByText('Completed')).toBeInTheDocument();

      rerender(<Badge variant="warning">In Progress</Badge>);
      expect(screen.getByText('In Progress')).toBeInTheDocument();

      rerender(<Badge variant="neutral">Draft</Badge>);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  describe('Alert', () => {
    it('renders alert message and triggers dismiss', () => {
      const handleDismiss = vi.fn();
      render(
        <Alert variant="error" title="Critical Issue" onDismiss={handleDismiss}>
          Database connection timed out
        </Alert>
      );

      expect(screen.getByText('Critical Issue')).toBeInTheDocument();
      expect(screen.getByText('Database connection timed out')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText('Dismiss alert');
      fireEvent.click(closeBtn);
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal', () => {
    it('renders modal dialog when isOpen is true', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          <p>Modal body content</p>
        </Modal>
      );

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal body content')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText(/close dialog/i);
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Hidden Modal">
          <p>Hidden content</p>
        </Modal>
      );

      expect(screen.queryByText('Hidden Modal')).not.toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('renders title, description, and action button', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          icon={<Inbox className="w-6 h-6" />}
          title="No Tickets Found"
          description="You do not have any open tickets in this queue."
          action={<Button onClick={handleAction}>Create Ticket</Button>}
        />
      );

      expect(screen.getByText('No Tickets Found')).toBeInTheDocument();
      expect(screen.getByText(/you do not have any open tickets/i)).toBeInTheDocument();

      const actionBtn = screen.getByRole('button', { name: /create ticket/i });
      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('ConfirmationDialog', () => {
    it('triggers onConfirm and onClose callbacks', () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();

      render(
        <ConfirmationDialog
          isOpen={true}
          title="Delete Resource"
          message="Are you sure you want to delete this resource?"
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      );

      expect(screen.getByText('Delete Resource')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      expect(handleConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
