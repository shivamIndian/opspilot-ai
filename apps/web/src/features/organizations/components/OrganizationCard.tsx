import React from 'react';
import { Link } from 'react-router-dom';
import type { SafeOrganization } from '@/types/organization';
import { Building2, Calendar, ArrowRight } from 'lucide-react';

export const OrganizationCard: React.FC<{
  organization: SafeOrganization;
  isActive?: boolean;
}> = ({ organization, isActive }) => {
  return (
    <div
      className={`rounded-2xl p-6 transition-all border ${
        isActive
          ? 'bg-indigo-950/20 border-indigo-500/40 shadow-xl shadow-indigo-950/20 ring-1 ring-indigo-500/20'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700/80 shadow-lg'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
            {organization.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={organization.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Building2 className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">{organization.name}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">/{organization.slug}</p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border ${
            organization.role === 'owner'
              ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
              : organization.role === 'admin'
                ? 'bg-purple-950/60 text-purple-300 border-purple-800/50'
                : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50'
          }`}
        >
          {organization.role}
        </span>
      </div>

      {organization.description && (
        <p className="text-xs text-slate-300 mt-4 line-clamp-2 leading-relaxed">
          {organization.description}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-mono text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          Joined{' '}
          {organization.joinedAt ? new Date(organization.joinedAt).toLocaleDateString() : 'Active'}
        </span>

        <Link
          to={`/organizations/${organization.id}`}
          className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          <span>Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
