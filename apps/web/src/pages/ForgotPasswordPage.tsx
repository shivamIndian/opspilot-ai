import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '@/services/authService';
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import {
  AuthLayout,
  AuthCard,
  AuthPageHeader,
} from '@/features/auth/components';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFieldError('Email address is required');
      return false;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setFieldError('Please enter a valid work email address');
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLoading) return;

    if (!validate()) return;

    try {
      setIsLoading(true);
      await authService.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { error?: { message?: string } } } })?.response;
      if (response?.status === 429) {
        setErrorMessage('Too many password reset requests. Please wait a moment before trying again.');
      } else {
        // Even on general error, display generic messaging or fallback to ensure user enumeration defense
        setSubmitted(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center space-y-4">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 mb-1 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Check Your Inbox
            </h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
              If an enterprise account exists for{' '}
              <span className="font-semibold text-[var(--text-primary)] font-mono">{email}</span>,
              a secure password reset link has been dispatched. The link will expire in 60 minutes.
            </p>

            <div className="pt-4 space-y-2">
              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
              >
                Send to a different email
              </Button>

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

  return (
    <AuthLayout>
      <AuthCard>
        <AuthPageHeader
          title="Reset your password"
          subtitle="Enter your verified work email address to receive secure reset instructions"
          icon={<KeyRound className="w-7 h-7" />}
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
            id="forgot-email"
            label="Work Email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@company.com"
            value={email}
            error={fieldError || undefined}
            disabled={isLoading}
            leftIcon={<Mail className="h-4 w-4" />}
            onChange={e => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(null);
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
            {isLoading ? 'Dispatching Link...' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
};
