import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  User,
  Shield,
  ShieldAlert,
  KeyRound,
  LogOut,
  Layers,
  CheckCircle2,
  Calendar,
  Fingerprint,
  Mail,
  Loader2,
  Lock,
  Building2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, logout, logoutAll } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to sign out of all active sessions and devices?')) {
      return;
    }
    setIsLoggingOutAll(true);
    try {
      await logoutAll();
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/60 border border-indigo-500/20 p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              Authenticated Session
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || 'Operator'}
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              OpsPilot AI enterprise session active. Role-based security, cryptographic token
              rotation, and in-memory access control enforced.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/organizations"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Building2 className="w-4 h-4" />
              <span>Manage Organizations</span>
            </Link>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut || isLoggingOutAll}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>Sign Out</span>
            </button>

            <button
              onClick={handleLogoutAll}
              disabled={isLoggingOut || isLoggingOutAll}
              className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoggingOutAll ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
              ) : (
                <KeyRound className="w-4 h-4 text-rose-400" />
              )}
              <span>Sign Out All Devices</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Profile & Security Posture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Identity Card */}
        <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xl">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{user?.name}</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {user?.email}
              </p>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Platform Role</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-[10px] tracking-wider border ${
                  user?.role === 'platform_admin'
                    ? 'bg-purple-950/60 text-purple-300 border-purple-800/50'
                    : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50'
                }`}
              >
                {user?.role === 'platform_admin' ? 'Platform Admin' : 'Standard User'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Account Status</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-[10px] tracking-wider border ${
                  user?.status === 'active'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                }`}
              >
                {user?.status || 'Active'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Email Verified</span>
              <span className="text-slate-200 font-medium flex items-center gap-1">
                {user?.emailVerified ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Verified</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300">Pending</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Subject ID</span>
              <span className="text-slate-300 font-mono text-[11px] truncate max-w-[160px] flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {user?.id}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Member Since</span>
              <span className="text-slate-300 font-mono text-[11px] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Security Controls & Session Protection */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Active Security Controls</h2>
              <p className="text-xs text-slate-400">Enterprise OWASP & Defense-in-Depth Policies</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                In-Memory Access Token
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                15-minute ephemeral JWT signed with HS256/RS256, kept strictly in memory. Never
                exposed to localStorage or sessionStorage.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                HttpOnly Refresh Cookies
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                7-day session token stored exclusively in secure SameSite=Strict cookies. Scoped
                specifically to /api/v1/auth.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Atomic Rotation & Reuse Detection
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every refresh cycle rotates the token in a PostgreSQL transaction. Replay of spent
                tokens revokes the entire token family.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Double-Submit CSRF Guard
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                State-changing refresh and logout actions mandate matching X-CSRF-Token
                cryptographic header validation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Platform Architecture Roadmap */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Platform Architecture Matrix</h2>
              <p className="text-xs text-slate-400">
                Module implementation and capability readiness
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1 rounded-lg">
            Module 03 Complete
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Module 01</span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                Active
              </span>
            </div>
            <p className="text-xs font-medium text-white">Core Foundation</p>
            <p className="text-[11px] text-slate-400 leading-tight">
              Monorepo setup, Vite React web app, Express API, FastAPI AI service, and health
              checks.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Module 02</span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                Active
              </span>
            </div>
            <p className="text-xs font-medium text-white">Data Infrastructure</p>
            <p className="text-[11px] text-slate-400 leading-tight">
              PostgreSQL 16 with pgvector, isolated app and ai schemas, Redis cache, and connection
              pools.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Module 03</span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                Active
              </span>
            </div>
            <p className="text-xs font-medium text-white">Auth & Security</p>
            <p className="text-[11px] text-slate-400 leading-tight">
              Argon2id hashing, JWT access tokens, session rotation, CSRF protection, and audit
              logs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Module 04</span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                Active
              </span>
            </div>
            <p className="text-xs font-medium text-white">Multi-Tenancy & Orgs</p>
            <p className="text-[11px] text-slate-400 leading-tight">
              Organizations, memberships, tenant-isolated workspaces, invitations, and RBAC granular
              roles.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2 ring-1 ring-indigo-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300">Module 05</span>
              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-800/40">
                Current
              </span>
            </div>
            <p className="text-xs font-medium text-white">Support Ticket Management</p>
            <p className="text-[11px] text-slate-400 leading-tight">
              Enterprise ticket workflows, sequential numbering, role-based visibility, internal
              notes, and activity tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
