import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { LogIn, Mail } from 'lucide-react';
import {
  AuthLayout,
  AuthCard,
  AuthPageHeader,
  PasswordInput,
} from '@/features/auth/components';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Checkbox } from '@/components/ui/Checkbox';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();

  const initialEmail = (location.state as { email?: string })?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLoading) return; // Prevent duplicate submissions

    if (!validate()) return;

    try {
      setIsLoading(true);
      const data = await authService.login({
        email: email.trim(),
        password,
      });

      setAuth(data);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { error?: { message?: string; code?: string } } } })?.response;
      const status = response?.status;
      const backendMessage = response?.data?.error?.message;

      if (status === 401) {
        setErrorMessage('Invalid email address or password. Please verify your credentials.');
      } else if (status === 403) {
        setErrorMessage(backendMessage || 'Your account has been suspended. Please contact administrator support.');
      } else if (status === 429) {
        setErrorMessage('Too many login attempts. Please wait a moment before trying again.');
      } else {
        setErrorMessage(
          backendMessage || (err as Error).message || 'Unable to sign in at this time. Please check your network connection.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthPageHeader
          title="Sign in to OpsPilot AI"
          subtitle="Access your autonomous enterprise operations and incident management workspace"
          icon={<LogIn className="w-7 h-7" />}
          badge="Enterprise Edition"
        />

        {errorMessage && (
          <div className="mb-5">
            <Alert variant="error" onDismiss={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="login-email"
            label="Work Email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@company.com"
            value={email}
            error={fieldErrors.email}
            disabled={isLoading}
            leftIcon={<Mail className="h-4 w-4" />}
            onChange={e => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
            }}
          />

          <div className="space-y-1">
            <PasswordInput
              id="login-password"
              label="Password"
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              value={password}
              error={fieldErrors.password}
              disabled={isLoading}
              onChange={e => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
              }}
            />

            <div className="flex items-center justify-between pt-1">
              <Checkbox
                id="remember-me"
                label="Remember me on this device"
                checked={rememberMe}
                disabled={isLoading}
                onChange={e => setRememberMe(e.target.checked)}
              />

              <Link
                to="/forgot-password"
                className="text-xs font-medium text-[var(--brand-primary)] hover:underline transition-colors"
                tabIndex={0}
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            Don't have an enterprise account?{' '}
            <Link
              to="/register"
              className="text-[var(--brand-primary)] hover:underline font-semibold transition-colors"
            >
              Create an account
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
};
