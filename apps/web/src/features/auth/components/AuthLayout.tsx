import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  ShieldCheck,
  BrainCircuit,
  Lock,
  Workflow,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

export interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const enterpriseFeatures = [
    {
      icon: Workflow,
      title: 'LangGraph Cognitive Orchestration',
      description: 'Stateful multi-agent incident triage and multi-step tool workflows.',
    },
    {
      icon: BrainCircuit,
      title: 'Hybrid Vector & Semantic RAG',
      description: 'Strictly evidence-grounded responses with verbatim source citations.',
    },
    {
      icon: ShieldCheck,
      title: 'Human-in-the-Loop Governance',
      description: 'Policy-gated tool execution checkpoints for high-risk operations.',
    },
    {
      icon: Lock,
      title: 'Cryptographic Multi-Tenancy',
      description: 'Isolated organization boundary and token-scoped data access controls.',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] flex flex-col justify-between selection:bg-[var(--brand-primary)] selection:text-white">
      {/* Top Navbar */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-primary)]/80 backdrop-blur-md sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--brand-primary)] to-indigo-400 text-white shadow-md transition-transform group-hover:scale-105">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              OpsPilot <span className="text-[var(--brand-primary)]">AI</span>
            </span>
            <span className="block text-[9px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
              Enterprise Agentic Platform
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content: 2-Column Desktop Grid / Single Column Mobile */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column (Desktop Branded Hero, hidden on mobile) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-4">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Generation Autonomous IT Operations</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
                Enterprise AI Incident Resolution & Knowledge Grounding
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg">
                Empower your engineering and support teams with stateful agentic workflows,
                policy-gated human approvals, and cryptographic tenant isolation.
              </p>
            </div>

            {/* Feature List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {enterpriseFeatures.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 backdrop-blur-sm space-y-1.5 transition-all hover:border-[var(--border-hover)]"
                  >
                    <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                        {feat.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Security Compliance Badges */}
            <div className="pt-2 flex items-center gap-4 text-[11px] text-[var(--text-tertiary)] border-t border-[var(--border-subtle)]">
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> SOC2 Type II Certified
              </span>
              <span>•</span>
              <span>AES-256 GCM</span>
              <span>•</span>
              <span>Tenant-Isolated Database</span>
            </div>
          </div>

          {/* Right Column: Authentication Card Form */}
          <div className="lg:col-span-6 flex items-center justify-center">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-[var(--text-tertiary)] border-t border-[var(--border-subtle)]">
        <p>&copy; {new Date().getFullYear()} OpsPilot AI. All rights reserved. Enterprise Security & Privacy Guaranteed.</p>
      </footer>
    </div>
  );
};
