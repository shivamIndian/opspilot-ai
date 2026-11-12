import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { organizationService } from '@/services/organizationService';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    orgName: string;
    orgId: string;
    role: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!token) {
      setErrorMessage('Invitation token is missing from the URL.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await organizationService.acceptInvitation(token);
      setSuccessData({
        orgName: result.organization.name,
        orgId: result.organization.id,
        role: result.role,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to accept invitation. The invitation link may be invalid, expired, or addressed to another account.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[75vh] py-8">
      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md space-y-6 text-center">
        <div className="inline-flex p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
          <Building2 className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Organization Invitation</h1>
          <p className="text-xs text-slate-400 mt-1">Join your team workspace on OpsPilot AI</p>
        </div>

        {!token && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              No invitation token provided. Please use the complete link from your invitation email.
            </span>
          </div>
        )}

        {isAuthLoading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            <p className="text-xs text-slate-400">Validating session...</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 text-left">
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <span>You must sign in to your OpsPilot AI account to accept this invitation.</span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Link
                to={`/login?redirect=/invitations/accept?token=${token}`}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl text-center transition-colors shadow-lg shadow-indigo-600/20"
              >
                Sign In to Accept
              </Link>
              <Link
                to={`/register?redirect=/invitations/accept?token=${token}`}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl text-center transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        ) : !user?.emailVerified ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-3 text-left">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-200">Email Verification Required</p>
                <p className="text-[11px] text-amber-300/90 mt-1 leading-relaxed">
                  Your account email ({user?.email}) is not yet verified. For security reasons,
                  invitations can only be accepted after email verification.
                </p>
              </div>
            </div>
            <Link
              to="/verify-email"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 hover:text-white"
            >
              <span>Go to Email Verification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : successData ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-left flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-200 text-sm">
                  Welcome to {successData.orgName}!
                </p>
                <p className="text-emerald-300/90 mt-1">
                  You have joined the workspace as a{' '}
                  <strong className="uppercase">{successData.role}</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/organizations/${successData.orgId}`)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <span>Enter Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-left flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 text-left space-y-1">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">
                Signed In As:
              </span>
              <span className="font-mono text-indigo-300 font-medium">{user?.email}</span>
            </div>

            <button
              onClick={handleAccept}
              disabled={isLoading || !token}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Joining Organization...</span>
                </>
              ) : (
                <span>Accept & Join Workspace</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
