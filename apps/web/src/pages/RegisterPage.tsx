import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '@/services/authService';
import { UserPlus, User, Mail, CheckCircle2 } from 'lucide-react';
import {
  AuthLayout,
  AuthCard,
  AuthPageHeader,
  PasswordInput,
  PasswordStrengthIndicator,
  isPasswordValid,
} from '@/features/auth/components';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Checkbox } from '@/components/ui/Checkbox';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const errors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    const cleanName = name.trim();
    if (!cleanName) {
      errors.name = 'Full name is required';
    } else if (cleanName.length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errors.email = 'Work email is required';
    } else if (!EMAIL_REGEX.test(cleanEmail)) {
      errors.email = 'Please enter a valid work email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (!isPasswordValid(password)) {
      errors.password = 'Password does not satisfy all complexity requirements';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptTerms) {
      errors.terms = 'You must accept the terms of service and privacy policy to continue';
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
      await authService.register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { error?: { message?: string; code?: string } } } })?.response;
      const status = response?.status;
      const backendMessage = response?.data?.error?.message;
      const code = response?.data?.error?.code;

      if (status === 409 || code === 'EMAIL_ALREADY_EXISTS') {
        setErrorMessage('An enterprise account with this email address already exists. Please sign in or use another email.');
      } else if (status === 429) {
        setErrorMessage('Too many requests. Please wait a moment before trying again.');
      } else {
        setErrorMessage(
          backendMessage || (err as Error).message || 'Registration failed. Please check your information and try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center space-y-4">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 mb-1 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Account Created Successfully
            </h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
              Your enterprise account has been created for{' '}
              <span className="font-semibold text-[var(--text-primary)] font-mono">{email}</span>.
              You can now sign in to access your autonomous operations workspace.
            </p>

            <div className="pt-4">
              <Link to="/login" state={{ email }}>
                <Button variant="primary" size="md" className="w-full">
                  Proceed to Sign In
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
          title="Create an enterprise account"
          subtitle="Get started with autonomous operations and agentic multi-tenant workflows"
          icon={<UserPlus className="w-7 h-7" />}
          badge="30-Day Evaluation"
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
            id="register-name"
            label="Full Name"
            type="text"
            autoComplete="name"
            required
            placeholder="Alice Johnson"
            value={name}
            error={fieldErrors.name}
            disabled={isLoading}
            leftIcon={<User className="h-4 w-4" />}
            onChange={e => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
            }}
          />

          <Input
            id="register-email"
            label="Work Email"
            type="email"
            autoComplete="email"
            required
            placeholder="alice@company.com"
            value={email}
            error={fieldErrors.email}
            disabled={isLoading}
            leftIcon={<Mail className="h-4 w-4" />}
            onChange={e => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
            }}
          />

          <div>
            <PasswordInput
              id="register-password"
              label="Password"
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

            {password.length > 0 && (
              <PasswordStrengthIndicator password={password} />
            )}
          </div>

          <PasswordInput
            id="register-confirm-password"
            label="Confirm Password"
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

          <div className="space-y-1">
            <Checkbox
              id="accept-terms"
              label="I accept the Enterprise Master Services Agreement and Privacy Policy"
              checked={acceptTerms}
              disabled={isLoading}
              onChange={e => {
                setAcceptTerms(e.target.checked);
                if (fieldErrors.terms) setFieldErrors(prev => ({ ...prev, terms: undefined }));
              }}
            />
            {fieldErrors.terms && (
              <p className="text-[11px] text-[var(--danger-text)] font-medium pl-6">
                {fieldErrors.terms}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            Already have an enterprise account?{' '}
            <Link
              to="/login"
              className="text-[var(--brand-primary)] hover:underline font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
};
