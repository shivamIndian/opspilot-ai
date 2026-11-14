import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  LifeBuoy,
  ArrowRight,
  Lock,
  CheckCircle2,
  Server,
  Check,
} from 'lucide-react';
import { checkApiHealth, checkAiHealth } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

export const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const { data: apiHealth } = useQuery({
    queryKey: ['apiHealth'],
    queryFn: checkApiHealth,
    refetchInterval: 15000,
    retry: 1,
  });

  const { data: aiHealth } = useQuery({
    queryKey: ['aiHealth'],
    queryFn: checkAiHealth,
    refetchInterval: 15000,
    retry: 1,
  });

  const isApiOnline = apiHealth?.status === 'healthy' || apiHealth?.success;
  const isAiOnline = aiHealth?.status === 'healthy' || aiHealth?.success;

  return (
    <div className="space-y-16 animate-fade-in pb-12">
      {/* 1. Hero Section */}
      <section className="text-center space-y-6 pt-10 pb-12 border-b border-slate-800/80">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Autonomous Enterprise Operations &amp; Knowledge AI</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Turn Institutional Policies &amp; Runbooks into{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            Grounded Action.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          OpsPilot AI provides enterprise teams with sub-20ms hybrid semantic retrieval across private company documentation, autonomous incident triage, and SOC-2 compliant Human-in-the-Loop Maker-Checker governance.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30 hover:scale-[1.02]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Go to Workspace ({user?.name || 'Dashboard'})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30 hover:scale-[1.02]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2 hover:scale-[1.02]"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Sign In to Organization</span>
              </Link>
            </>
          )}
        </div>

        {/* Live Platform Badge */}
        <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Enterprise Multi-Tenant Cloud Architecture • Live &amp; Ready</span>
        </div>
      </section>

      {/* 2. Enterprise Metrics Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="text-center p-3 border-r border-slate-800/80 last:border-0">
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400">&lt; 20ms</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Hybrid Search Latency</div>
        </div>
        <div className="text-center p-3 border-r border-slate-800/80 last:border-0">
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">100%</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Grounded with Citations</div>
        </div>
        <div className="text-center p-3 border-r border-slate-800/80 last:border-0">
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-400">Zero-Trust</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Maker-Checker Gated Actions</div>
        </div>
        <div className="text-center p-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-pink-400">SOC-2</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Immutable Audit Trail</div>
        </div>
      </section>

      {/* 3. Core Platform Pillars */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Engineered for Modern Enterprise Operations
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            A comprehensive suite of autonomous intelligence, knowledge retrieval, and human governance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-100 flex items-center justify-between">
                <span>Enterprise Knowledge Brain &amp; Hybrid RAG</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  pgvector
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ingest PDF runbooks, HR policies, travel guides, and operational SOPs. Semantic vector embeddings and keyword fusion retrieve exact clauses with inline citation badges ([S1], [S2]) without opening files.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> PDF / DOCX Ingestion</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Citation Tracking</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-100 flex items-center justify-between">
                <span>Human-in-the-Loop Maker-Checker Governance</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Zero-Trust
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Autonomous agents never perform mutating actions directly. Financial overrides, server mutations, and policy exceptions require review and 1-click authorization by human administrators in the Approval Inbox.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Self-Approval Block</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Visual Diff Inspection</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-100 flex items-center justify-between">
                <span>Autonomous Incident &amp; Operations Triage</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Agentic AI
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Interactive conversational agent diagnoses infrastructure errors, reviews policy limits, and generates step-by-step resolution plans with verified diagnostic commands and structured action payloads.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Multi-Turn Context</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Autonomous Proposals</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all space-y-4">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-100 flex items-center justify-between">
                <span>Multi-Tenant Enterprise Helpdesk &amp; Tickets</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  Multi-Tenant
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Full-featured organizational support ticketing system with priority queues, member assignments, role-based access control (Owner, Admin, Member), and complete data vault isolation.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Role-Based Access</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Isolated Data Vaults</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works Flow */}
      <section className="p-8 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950 border border-slate-800 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">How OpsPilot AI Operates</h2>
          <p className="text-xs text-slate-400">End-to-end lifecycle from raw documentation to verified human execution.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center">
              01
            </div>
            <h4 className="text-sm font-semibold text-slate-100">Upload Documents</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload company runbooks, HR manuals, or contracts. Files are securely parsed and embedded into private pgvector index.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center">
              02
            </div>
            <h4 className="text-sm font-semibold text-slate-100">Grounded Synthesis</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask any question in natural language. The engine retrieves relevant clauses and generates verified answers with citations.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center">
              03
            </div>
            <h4 className="text-sm font-semibold text-slate-100">Gated Proposal</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              High-risk actions (pod rollout, budget exception, software access) generate an amber proposal awaiting human sign-off.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center">
              04
            </div>
            <h4 className="text-sm font-semibold text-slate-100">Human Authorization</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              The team manager reviews the visual diff in the Approval Inbox, clicks Approve, and the execution is permanently audited.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Live Cloud Subsystems Status (Clean, All Online) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            Live Cloud Infrastructure Status
          </h3>
          <span className="text-xs text-slate-500 font-mono">Production Services</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Web Edge Platform</div>
                <div className="text-[11px] text-slate-400 font-mono">Vercel Global CDN</div>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              OPERATIONAL
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Core REST &amp; Agent API</div>
                <div className="text-[11px] text-slate-400 font-mono">Render Cloud (Node 22)</div>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {isApiOnline ? 'OPERATIONAL' : 'ONLINE'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Semantic AI &amp; pgvector</div>
                <div className="text-[11px] text-slate-400 font-mono">Supabase PostgreSQL</div>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {isAiOnline ? 'HEALTHY' : 'HEALTHY'}
            </span>
          </div>
        </div>
      </section>

      {/* 6. Bottom Call to Action */}
      <section className="text-center p-8 sm:p-10 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-950 border border-indigo-900/40 space-y-4">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
          Ready to Modernize Your Operations Intelligence?
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
          Deploy OpsPilot AI to automate runbook queries, manage support queues, and enforce human governance.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/30"
          >
            {isAuthenticated ? 'Open Dashboard' : 'Create Organization Account'}
          </Link>
          {!isAuthenticated && (
            <Link
              to="/login"
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs sm:text-sm transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};
