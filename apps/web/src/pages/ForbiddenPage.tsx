import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-border)] mb-5 shadow-lg">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <span className="font-mono text-xs font-semibold text-[var(--danger-text)] uppercase tracking-widest">
        403 Forbidden
      </span>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
        Access Denied
      </h1>

      <p className="mt-2 max-w-md text-xs text-[var(--text-secondary)] leading-relaxed">
        You do not have sufficient permissions to view this resource. Contact your organization administrator to request elevated access.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Go Back
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/dashboard')}
          leftIcon={<Home className="h-4 w-4" />}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};
