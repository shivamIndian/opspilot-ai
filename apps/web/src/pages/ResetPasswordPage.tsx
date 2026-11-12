import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '@/services/authService';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import {
  AuthLayout,
  AuthCard,
  AuthPageHeader,
  PasswordInput,
  PasswordStrengthIndicator,
  isPasswordValid,
} from '@/features/auth/components';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const errors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      errors.password = 'New password is required';
    } else if (!isPasswordValid(password)) {
      errors.password = 'Password does not meet the 12-character security requirements';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Missing password reset token. Please request a new link.');
      return;
    }

    if (isLoading) return;

    if (!validate()) return;

    try {
      setIsLoading(true);
      await authService.resetPassword(token, password);
      setIsSuccess(true);
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { error?: { message?: string; code?: string } } } })?.response;
      const status = response?.status;
      const code = response?.data?.error?.code;
      const backendMessage = response?.data?.error?.message;

      if (code === 'EXPIRED_RESET_TOKEN') {
        setErrorMessage('This password reset link has expired. Please request a new reset link.');
      } else if (code === 'INVALID_RESET_TOKEN') {
        setErrorMessage('This password reset token is invalid or has already been used.');
      } else if (status === 429) {
        setErrorMessage('Too many attempts. Please wait a moment before trying again.');
      } else {
        setErrorMessage(
          backendMessage || (err as Error).message || 'Unable to reset password. Please try again or request a new link.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center space-y-4">
            <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500 mb-1 shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Missing Reset Token
            </h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
              No password reset token was provided in the URL. If you followed a link from your email, please ensure the entire link was copied.
            </p>

            <div className="pt-4 space-y-2">
              <Link to="/forgot-password" className="block">
                <Button variant="primary" size="md" className="w-full">
                  Request New Reset Link
                </Button>
              </Link>
              <Link to="/login" className="block">
                <Button variant="ghost" size="md" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center space-y-4">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 mb-1 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Password Reset Complete
            </h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
              Your password has been securely updated. You can now access your OpsPilot AI workspace with your new credentials.
            </p>

            <div className="pt-4">
              <Link to="/login">
                <Button variant="primary" size="md" className="w-full">
                  Sign In with New Password
                </Button>
              </Link>
            </div>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <AuthPageHeader
          title="Create new password"
          subtitle="Choose a strong, unique passphrase with at least 12 characters"
          icon={<Lock className="w-7 h-7" />}
        />

        {errorMessage && (
          <div className="mb-5">
            <Alert variant="error" onDismiss={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <PasswordInput
              id="reset-password"
              label="New Password"
              autoComplete="new-password"
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

            {password.length > 0 && <PasswordStrengthIndicator password={password} />}
          </div>

          <PasswordInput
            id="reset-confirm-password"
            label="Confirm New Password"
            autoComplete="new-password"
            required
            placeholder="••••••••••••"
            value={confirmPassword}
            error={fieldErrors.confirmPassword}
            disabled={isLoading}
            onChange={e => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword)
                setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
            }}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Updating Password...' : 'Reset Password'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
};
