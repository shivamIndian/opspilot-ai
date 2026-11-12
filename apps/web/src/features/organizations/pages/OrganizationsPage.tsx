import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOrganizations } from '@/hooks/useOrganizations';
import { OrganizationCard } from '../components/OrganizationCard';
import { Building2, Plus, Loader2 } from 'lucide-react';

export const OrganizationsPage: React.FC = () => {
  const { organizations, activeOrganization, isLoading, fetchOrganizations } = useOrganizations();

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <span>Organizations</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your multi-tenant workspaces, team memberships, and security roles
          </p>
        </div>

        <Link
          to="/organizations/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Organization</span>
        </Link>
      </div>

      {isLoading && organizations.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading your organizations...</p>
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No organizations found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              You are not currently an active member of any organization. Create a new organization
              to start building with autonomous AI agents.
            </p>
          </div>
          <Link
            to="/organizations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create your first organization</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map(org => (
            <OrganizationCard
              key={org.id}
              organization={org}
              isActive={activeOrganization?.id === org.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
