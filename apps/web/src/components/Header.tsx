import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { OrganizationSwitcher } from '@/features/organizations/components/OrganizationSwitcher';
import { Bot, LogOut, LayoutDashboard, UserCheck, Shield } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-indigo-400 group-hover:bg-indigo-600/30 group-hover:border-indigo-500/50 transition-colors">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">OpsPilot</span>
            <span className="text-lg font-light text-indigo-400 ml-1">AI</span>
            <span className="ml-2 text-xs font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
              v0.4.0
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <OrganizationSwitcher />

              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-medium transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">Dashboard</span>
              </Link>

              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight font-mono">
                    {user.role === 'platform_admin' ? (
                      <span className="text-purple-400 flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> Admin
                      </span>
                    ) : (
                      <span className="text-indigo-400 flex items-center gap-0.5">
                        <UserCheck className="w-2.5 h-2.5" /> User
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1 cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-600/30 transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
