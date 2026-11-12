import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Download,
  Edit2,
  RotateCcw,
  Sparkles,
  Archive,
  ArrowLeft,
  Calendar,
  User,
  HardDrive,
  Copy,
  Check,
  Hash,
} from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAuth } from '@/hooks/useAuth';
import {
  useDocumentDetails,
  useArchiveDocument,
  useRestoreDocument,
  useReprocessDocument,
  useReprocessEmbeddings,
} from '../hooks/useDocuments';
import { documentService } from '../services/document.service';
import { DocumentTypeIcon } from '../components/DocumentTypeIcon';
import { DocumentStatusBadge } from '../components/DocumentStatusBadge';
import { ProcessingStatusBadge } from '../components/ProcessingStatusBadge';
import { EmbeddingStatusBadge } from '../components/EmbeddingStatusBadge';
import { ProcessingDetailsPanel } from '../components/ProcessingDetailsPanel';
import { EmbeddingDetailsPanel } from '../components/EmbeddingDetailsPanel';
import { DocumentEditDialog } from '../components/DocumentEditDialog';
import { formatBytes, formatDocumentDate } from '../utils/document-formatters';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export const DocumentDetailPage: React.FC = () => {
  const { organizationId, documentId } = useParams<{ organizationId: string; documentId: string }>();
  const navigate = useNavigate();
  const { activeOrganization } = useOrganizations();
  const { user } = useAuth();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: document, isLoading, error } = useDocumentDetails(organizationId, documentId);

  const archiveMutation = useArchiveDocument(organizationId);
  const restoreMutation = useRestoreDocument(organizationId);
  const reprocessMutation = useReprocessDocument(organizationId);
  const reprocessEmbeddingsMutation = useReprocessEmbeddings(organizationId);

  const userRole = activeOrganization?.role;
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
  const isUploader = document && user ? document.uploadedByUserId === user.id : false;
  const canManage = Boolean(isOwnerOrAdmin || isUploader);

  const handleDownload = async () => {
    if (!organizationId || !document) return;
    try {
      setErrorMessage(null);
      await documentService.downloadDocument(
        organizationId,
        document.id,
        document.originalFilename
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to download document');
    }
  };

  const handleCopyHash = () => {
    if (!document?.sha256Checksum) return;
    navigator.clipboard.writeText(document.sha256Checksum);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleArchiveToggle = async () => {
    if (!document || !canManage) return;
    try {
      setErrorMessage(null);
      if (document.status === 'active') {
        await archiveMutation.mutateAsync(document.id);
      } else {
        await restoreMutation.mutateAsync(document.id);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update document status');
    }
  };

  const handleReprocess = async () => {
    if (!document || !canManage) return;
    try {
      setErrorMessage(null);
      await reprocessMutation.mutateAsync(document.id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reprocess document');
    }
  };

  const handleReprocessEmbeddings = async () => {
    if (!document || !canManage) return;
    try {
      setErrorMessage(null);
      await reprocessEmbeddingsMutation.mutateAsync(document.id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reprocess embeddings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
        <p className="text-xs text-[var(--text-tertiary)] animate-pulse">
          Loading document specifications...
        </p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Alert variant="error" title="Document Not Found">
          {error instanceof Error
            ? error.message
            : 'The requested document could not be found or has been deleted.'}
        </Alert>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/organizations/${organizationId}/knowledge?tab=documents`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Documents</span>
        </Button>
      </div>
    );
  }

  const isArchived = document.status === 'archived';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Link
          to={`/organizations/${organizationId}/knowledge`}
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          Knowledge Base
        </Link>
        <span>/</span>
        <Link
          to={`/organizations/${organizationId}/knowledge?tab=documents`}
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          Documents
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--text-primary)] truncate max-w-xs">
          {document.displayName || document.originalFilename}
        </span>
      </div>

      {errorMessage && (
        <Alert variant="error" title="Action Failed" dismissible onDismiss={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Header and Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border-default)]">
            <DocumentTypeIcon extension={document.fileExtension} className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {document.displayName || document.originalFilename}
              </h1>
              <DocumentStatusBadge status={document.status} />
              <ProcessingStatusBadge status={document.processingStatus} />
              {document.embeddingStatus && (
                <EmbeddingStatusBadge status={document.embeddingStatus} />
              )}
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              Original: <span className="font-mono text-[var(--text-secondary)]">{document.originalFilename}</span>
            </p>
            {document.description && (
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">
                {document.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </Button>

          {canManage && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReprocess}
                className="flex items-center gap-1.5"
                title="Reprocess text parsing"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reprocess</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleReprocessEmbeddings}
                className="flex items-center gap-1.5"
                title="Reprocess vector embeddings"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Embeddings</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Metadata</span>
              </Button>

              <Button
                variant={isArchived ? 'secondary' : 'danger'}
                size="sm"
                onClick={handleArchiveToggle}
                className="flex items-center gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>{isArchived ? 'Restore' : 'Archive'}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Meta Specs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
            <HardDrive className="h-3.5 w-3.5" />
            <span>File Size</span>
          </div>
          <div className="text-base font-bold text-[var(--text-primary)]">
            {formatBytes(document.sizeBytes)}
          </div>
          <div className="text-[11px] text-[var(--text-tertiary)] uppercase font-mono">
            {document.mimeType}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
            <Calendar className="h-3.5 w-3.5" />
            <span>Uploaded At</span>
          </div>
          <div className="text-base font-bold text-[var(--text-primary)]">
            {formatDocumentDate(document.createdAt)}
          </div>
          <div className="text-[11px] text-[var(--text-tertiary)]">
            Updated {formatDocumentDate(document.updatedAt)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
            <User className="h-3.5 w-3.5" />
            <span>Uploaded By</span>
          </div>
          <div className="text-base font-bold text-[var(--text-primary)] truncate">
            {document.uploader?.name || 'Authorized Member'}
          </div>
          <div className="text-[11px] text-[var(--text-tertiary)] truncate">
            {document.uploader?.email || 'organization member'}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
            <div className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              <span>SHA-256 Checksum</span>
            </div>
            <button
              onClick={handleCopyHash}
              className="hover:text-[var(--text-primary)] transition-colors p-0.5"
              title="Copy hash"
            >
              {copiedHash ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
          <div className="text-[11px] font-mono text-[var(--text-primary)] truncate" title={document.sha256Checksum}>
            {document.sha256Checksum}
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)]">
            Tamper-proof content fingerprint
          </div>
        </div>
      </div>

      {/* Ingestion & Embedding Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProcessingDetailsPanel
          organizationId={organizationId || ''}
          document={document}
          canManage={canManage}
        />
        <EmbeddingDetailsPanel
          organizationId={organizationId || ''}
          document={document}
          canManage={canManage}
        />
      </div>

      {/* Edit Metadata Modal Dialog */}
      {isEditOpen && (
        <DocumentEditDialog
          organizationId={organizationId || ''}
          document={document}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </div>
  );
};
