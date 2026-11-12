import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import type { SafeOrganization, OrganizationMember } from '@/types/organization';
import { organizationService } from '@/services/organizationService';
import { useAuth } from '@/hooks/useAuth';
import { OrganizationSettingsForm } from '../components/OrganizationSettingsForm';
import { TransferOwnershipDialog } from '../components/TransferOwnershipDialog';
import { Settings, Crown, AlertCircle } from 'lucide-react';

export const OrganizationSettingsPage: React.FC = () => {
  const { organization } = useOutletContext<{ organization: SafeOrganization }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isOwner = organization.role === 'owner';

  useEffect(() => {
    if (isOwner) {
      organizationService
        .listMembers(organization.id, { status: 'active', limit: 100 })
        .then(data => setMembers(data.members))
        .catch(() => {});
    }
  }, [organization.id, isOwner]);

  const handleUpdate = async (data: {
    name?: string;
    slug?: string;
    description?: string;
    logo_url?: string | null;
  }) => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      await organizationService.updateOrganization(organization.id, data);
      setStatusMessage({ type: 'success', text: 'Settings updated successfully' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      await organizationService.archiveOrganization(organization.id);
      navigate('/organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async (newOwnerUserId: string) => {
    await organizationService.transferOwnership(organization.id, newOwnerUserId);
    setStatusMessage({
      type: 'success',
      text: 'Ownership transferred successfully. Your role is now Admin.',
    });
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>Organization Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure organization profile, workspace slug, and primary governance
        </p>
      </div>

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

      <OrganizationSettingsForm
        organization={organization}
        actorRole={organization.role}
        onUpdate={handleUpdate}
        onArchive={handleArchive}
        isLoading={isLoading}
      />

      {isOwner && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Ownership Governance</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Transfer primary ownership of this organization to another active collaborator. The new
            owner will assume complete governance and your role will automatically transition to
            Administrator.
          </p>
          <button
            type="button"
            onClick={() => setIsTransferOpen(true)}
            className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Transfer Ownership...
          </button>
        </div>
      )}

      <TransferOwnershipDialog
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        members={members}
        currentUserId={user?.id || ''}
        onTransfer={handleTransfer}
      />
    </div>
  );
};
