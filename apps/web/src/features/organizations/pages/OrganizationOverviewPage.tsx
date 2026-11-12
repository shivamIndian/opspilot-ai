import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import type { SafeOrganization } from '@/types/organization';
import { Building2, ShieldCheck, Users, Mail, ArrowRight } from 'lucide-react';

export const OrganizationOverviewPage: React.FC = () => {
  const { organization } = useOutletContext<{ organization: SafeOrganization }>();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>Workspace Overview</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {organization.description ||
              'No organization description provided. Configure team objectives in Settings.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Workspace Slug
              </span>
              <p className="text-xs font-mono text-indigo-300">/{organization.slug}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Created Date
              </span>
              <p className="text-xs font-mono text-slate-300">
                {new Date(organization.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Multi-Tenant Isolation</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            This workspace operates under strict database tenancy. Cross-organization access is
            cryptographically blocked at the API gateway layer.
          </p>

          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300 space-y-1">
            <span className="font-semibold block">Active Role:</span>
            <span className="font-mono uppercase text-[11px] text-indigo-200">
              {organization.role}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to={`/organizations/${organization.id}/members`}
          className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all group cursor-pointer block"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Team Directory</h3>
                <p className="text-xs text-slate-400">View active members and manage team roles</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        {(organization.role === 'owner' || organization.role === 'admin') && (
          <Link
            to={`/organizations/${organization.id}/invitations`}
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all group cursor-pointer block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pending Invitations</h3>
                  <p className="text-xs text-slate-400">Track and dispatch pending team invites</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};
