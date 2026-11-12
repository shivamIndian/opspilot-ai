import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '@/services/authService';
import { MailCheck, CheckCircle2, Loader2, Send, ArrowRight } from 'lucide-react';
import {
  AuthLayout,
  AuthCard,
  AuthPageHeader,
} from '@/features/auth/components';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend verification state
  const [resendEmail, setResendEmail] = useState('');
  const [resendError, setResendError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    if (token && !hasAttemptedRef.current) {
      hasAttemptedRef.current = true;
      handleVerify(token);
    }
  }, [token]);

  const handleVerify = async (tok: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await authService.verifyEmail(tok);
      setIsSuccess(true);
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { error?: { message?: string; code?: string } } } })?.response;
      const code = response?.data?.error?.code;
      const backendMessage = response?.data?.error?.message;

      if (code === 'EXPIRED_VERIFICATION_TOKEN') {
        setErrorMessage('Email verification link has expired. Please request a new one below.');
      } else if (code === 'INVALID_VERIFICATION_TOKEN') {
        setErrorMessage('Verification link is invalid or has already been consumed.');
      } else {
        setErrorMessage(
          backendMessage || (err as Error).message || 'Unable to verify email address. Please try requesting a new link.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendError(null);
    setResendMessage(null);

    const clean = resendEmail.trim();
    if (!clean) {
      setResendError('Email address is required');
      return;
    }
    if (!EMAIL_REGEX.test(clean)) {
      setResendError('Please enter a valid work email address');
      return;
    }

    try {
      setIsResending(true);
      const msg = await authService.resendVerification(clean);
      setResendMessage(
        msg || 'If an account exists and is unverified, a fresh verification email has been dispatched.'
      );
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { error?: { message?: string } } } })?.response;
      setResendError(
        response?.data?.error?.message || (err as Error).message || 'Failed to dispatch verification email.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        {isLoading ? (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--brand-primary)] mx-auto" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Verifying Email Address...
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Communicating with enterprise identity service to validate your token.
            </p>
          </div>
        ) : isSuccess ? (
          <div className="text-center space-y-4">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 mb-1 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Email Verified Successfully
            </h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
              Your email address has been authenticated. Your enterprise account is now fully active and ready for use.
            </p>

            <div className="pt-4">
              <Link to="/login">
                <Button variant="primary" size="md" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Proceed to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <AuthPageHeader
              title={token ? 'Verification Failed' : 'Verify Your Email'}
              subtitle={
                token
                  ? 'We were unable to verify your email with the provided link.'
                  : 'Check your email for the confirmation link or request a new one below.'
              }
              icon={<MailCheck className="w-7 h-7" />}
            />

            {errorMessage && (
              <Alert variant="error" onDismiss={() => setErrorMessage(null)}>
                {errorMessage}
              </Alert>
            )}

            {resendMessage && (
              <Alert variant="success" onDismiss={() => setResendMessage(null)}>
                {resendMessage}
              </Alert>
            )}

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                <Send className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Resend Verification Email</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Enter your registered work email to receive a fresh verification link.
              </p>

              <form onSubmit={handleResend} noValidate className="space-y-3 pt-1">
                <Input
                  id="resend-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@company.com"
                  value={resendEmail}
                  error={resendError || undefined}
                  disabled={isResending}
                  onChange={e => {
                    setResendEmail(e.target.value);
                    if (resendError) setResendError(null);
                  }}
                />

                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  isLoading={isResending}
                  disabled={isResending}
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                >
                  {isResending ? 'Sending Link...' : 'Dispatch Verification Link'}
                </Button>
              </form>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] text-center">
              <Link
                to="/login"
                className="text-xs text-[var(--brand-primary)] hover:underline font-medium transition-colors"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  );
};
