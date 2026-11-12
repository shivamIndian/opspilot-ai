import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { organizationService } from '@/services/organizationService';
import { useOrganizations } from '@/hooks/useOrganizations';
import {
  Building2,
  Globe,
  FileText,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

export const CreateOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const { fetchOrganizations, setActiveOrganization } = useOrganizations();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Organization name is required.');
      return;
    }

    setIsLoading(true);
    try {
      const org = await organizationService.createOrganization({
        name: name.trim(),
        slug: slug.trim() ? slug.trim().toLowerCase() : undefined,
        description: description.trim() || undefined,
      });

      await fetchOrganizations();
      setActiveOrganization(org);
      navigate(`/organizations/${org.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to create organization';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <Link
        to="/organizations"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Organizations</span>
      </Link>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md space-y-6">
        <div className="space-y-1.5">
          <div className="inline-flex p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create an Organization</h1>
          <p className="text-xs text-slate-400">
            Set up a multi-tenant workspace for your company or team. You will automatically become
            the primary Owner.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
              Organization Name
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Acme Corporation"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
                Workspace Slug
              </label>
              <span className="text-[11px] text-slate-500">Auto-generated if left blank</span>
            </div>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase())}
                placeholder="acme-corp"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
              Description (Optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Enterprise AI support and incident operations workspace..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Enterprise Data Isolation Guaranteed
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every organization is bounded by strict database-level tenancy. Members and AI tools
              from other organizations can never access your workspaces or documents.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Link
              to="/organizations"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <span>Create Organization</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
