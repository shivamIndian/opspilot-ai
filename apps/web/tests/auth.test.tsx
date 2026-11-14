import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { PublicRoute } from '@/routes/PublicRoute';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { queryClient } from '@/app/query-client';
import { ThemeProvider } from '@/providers/ThemeProvider';

vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    getMe: vi.fn(),
  },
}));

describe('Module 17 – Authentication UI Component & Flow Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      csrfToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  describe('LoginPage', () => {
    it('validates empty email and password submission', async () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <LoginPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Email address is required')).toBeInTheDocument();
      expect(await screen.findByText('Password is required')).toBeInTheDocument();
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('validates invalid email format', async () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <LoginPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('name@company.com'), {
        target: { value: 'invalid-email' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('submits valid credentials and sets authenticated session', async () => {
      vi.mocked(authService.login).mockResolvedValueOnce({
        user: {
          id: 'user-123',
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'user',
          status: 'active',
          emailVerified: true,
          createdAt: new Date().toISOString(),
        },
        accessToken: 'access-jwt-token',
        csrfToken: 'csrf-secret-token',
        expiresIn: 900,
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <ThemeProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<div>Target Dashboard</div>} />
            </Routes>
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('name@company.com'), {
        target: { value: 'jane@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
        target: { value: 'SecurePass123!@#' },
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'jane@example.com',
          password: 'SecurePass123!@#',
        });
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
        expect(useAuthStore.getState().user?.email).toBe('jane@example.com');
      });
    });

    it('displays error message on invalid credentials (401)', async () => {
      vi.mocked(authService.login).mockRejectedValueOnce({
        response: { status: 401, data: { error: { message: 'Invalid credentials' } } },
      });

      render(
        <MemoryRouter>
          <ThemeProvider>
            <LoginPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('name@company.com'), {
        target: { value: 'wrong@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
        target: { value: 'WrongPassword123!' },
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(
        await screen.findByText('Invalid email address or password. Please verify your credentials.')
      ).toBeInTheDocument();
    });

    it('displays error on account suspended (403)', async () => {
      vi.mocked(authService.login).mockRejectedValueOnce({
        response: {
          status: 403,
          data: { error: { message: 'Your account has been suspended. Please contact administrator support.' } },
        },
      });

      render(
        <MemoryRouter>
          <ThemeProvider>
            <LoginPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('name@company.com'), {
        target: { value: 'suspended@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
        target: { value: 'SecurePass123!@#' },
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(
        await screen.findByText(/your account has been suspended/i)
      ).toBeInTheDocument();
    });

    it('handles rate-limiting (429)', async () => {
      vi.mocked(authService.login).mockRejectedValueOnce({
        response: { status: 429, data: { error: { message: 'Too many requests' } } },
      });

      render(
        <MemoryRouter>
          <ThemeProvider>
            <LoginPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('name@company.com'), {
        target: { value: 'rate@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
        target: { value: 'SecurePass123!@#' },
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(
        await screen.findByText(/too many login attempts/i)
      ).toBeInTheDocument();
    });
  });

  describe('RegisterPage', () => {
    it('validates required fields, password policy and terms acceptance', async () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <RegisterPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Full name is required')).toBeInTheDocument();
      expect(await screen.findByText('Work email is required')).toBeInTheDocument();
      expect(await screen.findByText('Password is required')).toBeInTheDocument();
      expect(await screen.findByText('Please confirm your password')).toBeInTheDocument();
      expect(await screen.findByText(/you must accept the terms/i)).toBeInTheDocument();
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('rejects passwords failing the 12-character policy', async () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <RegisterPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('Alice Johnson'), {
        target: { value: 'Alice Johnson' },
      });
      fireEvent.change(screen.getByPlaceholderText('alice@company.com'), {
        target: { value: 'alice@company.com' },
      });
      // Short 8-character password
      const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
      fireEvent.change(passwordInputs[0], { target: { value: 'Short1!' } });
      fireEvent.change(passwordInputs[1], { target: { value: 'Short1!' } });

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      expect(
        await screen.findByText('Password does not satisfy all complexity requirements')
      ).toBeInTheDocument();
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('rejects password confirmation mismatch', async () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <RegisterPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
      fireEvent.change(passwordInputs[0], { target: { value: 'ValidPass1234!@#' } });
      fireEvent.change(passwordInputs[1], { target: { value: 'DifferentPass1234!@#' } });

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    });

    it('submits valid registration and displays confirmation screen', async () => {
      vi.mocked(authService.register).mockResolvedValueOnce({
        user: {
          id: 'u-1',
          name: 'Alice Johnson',
          email: 'alice@company.com',
          role: 'user',
          status: 'active',
          emailVerified: false,
          createdAt: new Date().toISOString(),
        },
      });

      render(
        <MemoryRouter>
          <ThemeProvider>
            <RegisterPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('Alice Johnson'), {
        target: { value: 'Alice Johnson' },
      });
      fireEvent.change(screen.getByPlaceholderText('alice@company.com'), {
        target: { value: 'alice@company.com' },
      });

      const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
      fireEvent.change(passwordInputs[0], { target: { value: 'ValidPass1234!@#' } });
      fireEvent.change(passwordInputs[1], { target: { value: 'ValidPass1234!@#' } });

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Account Created Successfully')).toBeInTheDocument();
      expect(screen.getByText(/Proceed to Sign In/i)).toBeInTheDocument();
      expect(authService.register).toHaveBeenCalledWith({
        name: 'Alice Johnson',
        email: 'alice@company.com',
        password: 'ValidPass1234!@#',
      });
    });

    it('handles email already registered response (409 Conflict)', async () => {
      vi.mocked(authService.register).mockRejectedValueOnce({
        response: {
          status: 409,
          data: { error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Email already registered' } },
        },
      });

      render(
        <MemoryRouter>
          <ThemeProvider>
            <RegisterPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('Alice Johnson'), {
        target: { value: 'Alice Johnson' },
      });
      fireEvent.change(screen.getByPlaceholderText('alice@company.com'), {
        target: { value: 'exists@company.com' },
      });

      const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
      fireEvent.change(passwordInputs[0], { target: { value: 'ValidPass1234!@#' } });
      fireEvent.change(passwordInputs[1], { target: { value: 'ValidPass1234!@#' } });

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      expect(
        await screen.findByText(/an enterprise account with this email address already exists/i)
      ).toBeInTheDocument();
    });
  });

  describe('ForgotPasswordPage', () => {
    it('validates empty email address', async () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <ForgotPasswordPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
      expect(await screen.findByText('Email address is required')).toBeInTheDocument();
      expect(authService.forgotPassword).not.toHaveBeenCalled();
    });

    it('submits email and displays generic confirmation screen to prevent enumeration', async () => {
      vi.mocked(authService.forgotPassword).mockResolvedValueOnce('Dispatched');

      render(
        <MemoryRouter>
          <ThemeProvider>
            <ForgotPasswordPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('name@company.com'), {
        target: { value: 'forgot@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      expect(await screen.findByText('Check Your Inbox')).toBeInTheDocument();
      expect(screen.getByText(/a secure password reset link has been dispatched/i)).toBeInTheDocument();
      expect(authService.forgotPassword).toHaveBeenCalledWith('forgot@example.com');
    });
  });

  describe('ResetPasswordPage', () => {
    it('displays warning when reset token is missing from URL', async () => {
      render(
        <MemoryRouter initialEntries={['/reset-password']}>
          <ThemeProvider>
            <ResetPasswordPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Missing Reset Token')).toBeInTheDocument();
      expect(screen.getByText('Request New Reset Link')).toBeInTheDocument();
    });

    it('submits valid new password with token and shows success screen', async () => {
      vi.mocked(authService.resetPassword).mockResolvedValueOnce('Success');

      render(
        <MemoryRouter initialEntries={['/reset-password?token=valid-reset-token-123']}>
          <ThemeProvider>
            <ResetPasswordPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
      fireEvent.change(passwordInputs[0], { target: { value: 'NewSecurePass123!@#' } });
      fireEvent.change(passwordInputs[1], { target: { value: 'NewSecurePass123!@#' } });

      fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

      expect(await screen.findByText('Password Reset Complete')).toBeInTheDocument();
      expect(authService.resetPassword).toHaveBeenCalledWith(
        'valid-reset-token-123',
        'NewSecurePass123!@#'
      );
    });

    it('handles expired reset token (EXPIRED_RESET_TOKEN)', async () => {
      vi.mocked(authService.resetPassword).mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: { code: 'EXPIRED_RESET_TOKEN', message: 'Token expired' } },
        },
      });

      render(
        <MemoryRouter initialEntries={['/reset-password?token=expired-token-123']}>
          <ThemeProvider>
            <ResetPasswordPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
      fireEvent.change(passwordInputs[0], { target: { value: 'NewSecurePass123!@#' } });
      fireEvent.change(passwordInputs[1], { target: { value: 'NewSecurePass123!@#' } });

      fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

      expect(
        await screen.findByText(/this password reset link has expired/i)
      ).toBeInTheDocument();
    });
  });

  describe('VerifyEmailPage', () => {
    it('automatically triggers verification when token is present and shows success state', async () => {
      vi.mocked(authService.verifyEmail).mockResolvedValueOnce('Verified');

      render(
        <MemoryRouter initialEntries={['/verify-email?token=email-tok-789']}>
          <ThemeProvider>
            <VerifyEmailPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Email Verified Successfully')).toBeInTheDocument();
      expect(screen.getByText('Proceed to Sign In')).toBeInTheDocument();
      expect(authService.verifyEmail).toHaveBeenCalledWith('email-tok-789');
    });

    it('shows error state and resend verification form when token is invalid', async () => {
      vi.mocked(authService.verifyEmail).mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: { code: 'INVALID_VERIFICATION_TOKEN', message: 'Invalid token' } },
        },
      });

      render(
        <MemoryRouter initialEntries={['/verify-email?token=bad-tok']}>
          <ThemeProvider>
            <VerifyEmailPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      expect(
        await screen.findByText(/verification link is invalid or has already been consumed/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
    });

    it('submits resend verification request successfully', async () => {
      vi.mocked(authService.resendVerification).mockResolvedValueOnce(
        'A fresh verification email has been dispatched.'
      );

      render(
        <MemoryRouter initialEntries={['/verify-email']}>
          <ThemeProvider>
            <VerifyEmailPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText('name@company.com'), {
        target: { value: 'resend@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /dispatch verification link/i }));

      expect(
        await screen.findByText(/a fresh verification email has been dispatched/i)
      ).toBeInTheDocument();
      expect(authService.resendVerification).toHaveBeenCalledWith('resend@example.com');
    });
  });

  describe('Routing Guards & Session State', () => {
    it('PublicRoute redirects authenticated user away from public login route', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        user: {
          id: 'u-auth',
          name: 'Authenticated User',
          email: 'auth@ops.ai',
          role: 'user',
          status: 'active',
          emailVerified: true,
          createdAt: new Date().toISOString(),
        },
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<div>Login Page View</div>} />
            </Route>
            <Route path="/dashboard" element={<div>Dashboard Redirect View</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText('Login Page View')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard Redirect View')).toBeInTheDocument();
    });

    it('ProtectedRoute redirects unauthenticated user to /login with target state', () => {
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
            </Route>
            <Route path="/login" element={<div>Login Screen Reached</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
      expect(screen.getByText('Login Screen Reached')).toBeInTheDocument();
    });

    it('clearAuth clears authentication, active organization and query cache', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        user: {
          id: 'u-clear',
          name: 'Clear Test',
          email: 'clear@ops.ai',
          role: 'user',
          status: 'active',
          emailVerified: true,
          createdAt: new Date().toISOString(),
        },
        accessToken: 'active-token',
        csrfToken: 'active-csrf',
      });

      useOrganizationStore.setState({
        activeOrganization: {
          id: 'org-active',
          name: 'Active Org',
          slug: 'active-org',
          role: 'owner',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      const clearQuerySpy = vi.spyOn(queryClient, 'clear');

      useAuthStore.getState().clearAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useOrganizationStore.getState().activeOrganization).toBeNull();
      expect(clearQuerySpy).toHaveBeenCalled();
    });
  });
});
