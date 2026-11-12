import React, { useEffect, useState } from 'react';
import { useParams, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { organizationService } from '@/services/organizationService';
import { useOrganizations } from '@/hooks/useOrganizations';
import type { SafeOrganization } from '@/types/organization';
import {
  Building2,
  Users,
  Mail,
  Settings,
  Shield,
  UserCheck,
  Loader2,
  AlertCircle,
  LayoutDashboard,
  Ticket as TicketIcon,
  FileText,
  Compass,
} from 'lucide-react';

export const OrganizationLayout: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { setActiveOrganization } = useOrganizations();

  const [organization, setOrganization] = useState<SafeOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    organizationService
      .getOrganization(organizationId)
      .then(org => {
        if (isMounted) {
          setOrganization(org);
          setActiveOrganization(org);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg =
            (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
              ?.error?.message ||
            (err as Error).message ||
            'Unable to load organization';
          setError(msg);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [organizationId, setActiveOrganization]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading organization workspace...</p>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="text-left">
            <p className="font-semibold text-rose-200">Access Denied or Not Found</p>
            <p className="mt-1 text-slate-300">{error || 'Organization unavailable'}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/organizations')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
        >
          Return to Organizations
        </button>
      </div>
    );
  }

  const isOwner = organization.role === 'owner';
  const isAdmin = organization.role === 'admin' || isOwner;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      {/* Header Banner */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xl overflow-hidden">
              {organization.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white">{organization.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                    organization.role === 'owner'
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                      : organization.role === 'admin'
                        ? 'bg-purple-950/60 text-purple-300 border-purple-800/50'
                        : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50'
                  }`}
                >
                  {organization.role === 'owner' ? (
                    <span className="flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" /> Owner
                    </span>
                  ) : organization.role === 'admin' ? (
                    <span className="flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" /> Admin
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-2.5 h-2.5" /> Member
                    </span>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">/{organization.slug}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-slate-800/80 mt-6 pt-3 overflow-x-auto text-xs">
          <NavLink
            to={`/organizations/${organization.id}`}
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview</span>
          </NavLink>

          <NavLink
            to={`/organizations/${organization.id}/tickets`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <TicketIcon className="w-3.5 h-3.5" />
            <span>Tickets</span>
          </NavLink>

          <NavLink
            to={`/organizations/${organization.id}/documents`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents</span>
          </NavLink>

          <NavLink
            to={`/organizations/${organization.id}/knowledge/search`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <Compass className="w-3.5 h-3.5" />
            <span>RAG Search</span>
          </NavLink>

          <NavLink
            to={`/organizations/${organization.id}/members`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to={`/organizations/${organization.id}/invitations`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Invitations</span>
            </NavLink>
          )}

          {isAdmin && (
            <NavLink
              to={`/organizations/${organization.id}/settings`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </NavLink>
          )}
        </div>
      </div>

      {/* Outlet for Sub-Pages */}
      <Outlet context={{ organization, refetchOrg: () => {} }} />
    </div>
  );
};
