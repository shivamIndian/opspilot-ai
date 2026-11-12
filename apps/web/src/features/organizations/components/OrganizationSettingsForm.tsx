import React, { useState } from 'react';
import type { SafeOrganization, OrganizationRole } from '@/types/organization';
import {
  Building2,
  Globe,
  FileText,
  Image,
  Save,
  Loader2,
  AlertCircle,
  Archive,
} from 'lucide-react';

export const OrganizationSettingsForm: React.FC<{
  organization: SafeOrganization;
  actorRole?: OrganizationRole;
  onUpdate: (data: {
    name?: string;
    slug?: string;
    description?: string;
    logo_url?: string | null;
  }) => Promise<void>;
  onArchive?: () => Promise<void>;
  isLoading?: boolean;
}> = ({ organization, actorRole, onUpdate, onArchive, isLoading }) => {
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [description, setDescription] = useState(organization.description || '');
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl || '');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isOwner = actorRole === 'owner';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    try {
      await onUpdate({
        name,
        slug,
        description: description || undefined,
        logo_url: logoUrl || null,
      });
      setStatusMessage({ type: 'success', text: 'Organization profile updated successfully.' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Failed to update organization profile';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleArchive = async () => {
    if (
      !window.confirm(
        'Are you sure you want to archive this organization? All member access will be suspended.'
      )
    ) {
      return;
    }
    if (onArchive) {
      await onArchive();
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5"
      >
        <h3 className="text-base font-bold text-white">General Settings</h3>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Organization Name</label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Workspace Slug</label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase())}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">Description</label>
          <div className="relative">
            <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the organization and team mission..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">Logo Image URL</label>
          <div className="relative">
            <Image className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="url"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      {isOwner && onArchive && (
        <div className="bg-rose-950/20 border border-rose-800/40 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-rose-300 font-bold text-sm">
            <Archive className="w-4 h-4 text-rose-400" />
            <span>Danger Zone</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Archiving an organization renders it read-only and halts all active workspaces, members,
            and AI tasks. This action requires organization owner authorization.
          </p>
          <button
            type="button"
            onClick={handleArchive}
            disabled={isLoading}
            className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Archive This Organization
          </button>
        </div>
      )}
    </div>
  );
};
