import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Server,
  Cpu,
  Globe,
  Terminal,
  Workflow,
  Database,
  Layers,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { StatusCard } from '@/components/StatusCard';
import { checkApiHealth, checkAiHealth, API_BASE_URL } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

export const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const { data: apiHealth, isError: isApiError } = useQuery({
    queryKey: ['apiHealth'],
    queryFn: checkApiHealth,
    refetchInterval: 10000,
    retry: 1,
  });

  const { data: aiHealth, isError: isAiError } = useQuery({
    queryKey: ['aiHealth'],
    queryFn: checkAiHealth,
    refetchInterval: 10000,
    retry: 1,
  });

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Header Section */}
      <div className="text-center space-y-4 py-8 border-b border-slate-800/80">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
          <Workflow className="w-3.5 h-3.5" /> OpsPilot AI Architecture
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
          OpsPilot AI
        </h1>

        <p className="text-xl sm:text-2xl font-medium text-indigo-300">
          Enterprise Agentic AI Support Platform
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Go to Secure Dashboard ({user?.name})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <Lock className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm transition-all flex items-center gap-2"
              >
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Services Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Core Runtime Services
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Monorepo Workspaces &amp; Subsystems
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatusCard
            title="Web Frontend"
            service="@opspilot/web"
            port={5173}
            description="Vite, React 18, TypeScript strict mode, Tailwind CSS, TanStack Query, and Zustand state management."
            status="healthy"
            icon={Globe}
            endpoint="http://localhost:5173"
          />

          <StatusCard
            title="Core REST API"
            service="@opspilot/api"
            port={4000}
            description="Node.js 22, Express, TypeScript, Zod environment validation, Helmet security, and CORS."
            status={apiHealth?.status === 'healthy' ? 'healthy' : isApiError ? 'error' : 'pending'}
            icon={Server}
            endpoint={`${API_BASE_URL}/health`}
          />

          <StatusCard
            title="AI Microservice"
            service="opspilot-ai-service"
            port={8000}
            description="Python 3.11, FastAPI, Pydantic v2 settings, Uvicorn ASGI server, managed with uv package manager."
            status={aiHealth?.status === 'healthy' ? 'healthy' : isAiError ? 'error' : 'pending'}
            icon={Cpu}
            endpoint="http://localhost:8000/health"
          />
        </div>
      </section>

      {/* Architecture Foundations Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CLI Quick Reference */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-base">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span>Developer Orchestration Commands</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Execute these scripts from the repository root to start individual services or launch
            the entire ecosystem simultaneously:
          </p>

          <div className="space-y-2 font-mono text-xs">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-indigo-300">npm run dev</span>
              <span className="text-slate-400 text-[11px]">
                Starts Web, API, and AI concurrently
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-cyan-300">npm run dev:web</span>
              <span className="text-slate-400 text-[11px]">Starts Vite dev server on :5173</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-emerald-300">npm run dev:api</span>
              <span className="text-slate-400 text-[11px]">Starts Express Node API on :4000</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-fuchsia-300">npm run dev:ai</span>
              <span className="text-slate-400 text-[11px]">Starts FastAPI via uv on :8000</span>
            </div>
          </div>
        </div>

        {/* Scope Boundaries */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-base">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>Module 01 Scope Boundary</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Module 01 establishes the strict structural, architectural, and operational foundation.
            Advanced features are scheduled for subsequent modules:
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>DB / Redis: Module 02</span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-slate-300 flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5 text-slate-400" />
              <span>Auth &amp; RBAC: Module 03</span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>RAG &amp; Vector: Module 06</span>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-slate-300 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span>LangGraph: Module 10</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
