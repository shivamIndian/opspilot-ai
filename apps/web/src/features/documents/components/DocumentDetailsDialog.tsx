import React, { useState } from 'react';
import {
  X,
  Download,
  Edit2,
  Archive,
  RotateCcw,
  Copy,
  Check,
  FileCheck,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import type { SafeDocument } from '../types/document.types';
import { DocumentTypeIcon } from './DocumentTypeIcon';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { ProcessingDetailsPanel } from './ProcessingDetailsPanel';
import { EmbeddingDetailsPanel } from './EmbeddingDetailsPanel';
import {
  formatBytes,
  formatDocumentDate,
  getExtensionBadgeTheme,
} from '../utils/document-formatters';
import { documentService } from '../services/document.service';

interface DocumentDetailsDialogProps {
  organizationId: string;
  document: SafeDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (doc: SafeDocument) => void;
  onArchive: (doc: SafeDocument) => void;
  onRestore: (doc: SafeDocument) => void;
  canManage: boolean;
  canEdit: boolean;
}

export const DocumentDetailsDialog: React.FC<DocumentDetailsDialogProps> = ({
  organizationId,
  document,
  isOpen,
  onClose,
  onEdit,
  onArchive,
  onRestore,
  canManage,
  canEdit,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  if (!isOpen || !document) return null;

  const badgeTheme = getExtensionBadgeTheme(document.fileExtension);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await documentService.downloadDocument(
        organizationId,
        document.id,
        document.originalFilename
      );
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyChecksum = () => {
    navigator.clipboard.writeText(document.sha256Checksum);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-3 min-w-0 pr-4">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0">
              <DocumentTypeIcon extension={document.fileExtension} size="lg" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {document.displayName}
                </h2>
                <DocumentStatusBadge status={document.status} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {document.originalFilename}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Description */}
          {document.description ? (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Description
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
                {document.description}
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">No description provided.</div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400">File Type</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeTheme.badgeClasses}`}
                >
                  {badgeTheme.label}
                </span>
                <span className="text-slate-400">({document.mimeType})</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400">File Size</span>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {formatBytes(document.sizeBytes)} ({document.sizeBytes.toLocaleString()} bytes)
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400">Uploaded By</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{document.uploader?.name || 'Unknown User'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 dark:text-slate-400">Uploaded On</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDocumentDate(document.createdAt)}</span>
              </div>
            </div>

            {document.archivedAt && (
              <div className="space-y-1 col-span-2">
                <span className="text-slate-500 dark:text-slate-400">Archived On</span>
                <p className="font-medium text-rose-600 dark:text-rose-400">
                  {formatDocumentDate(document.archivedAt)}
                </p>
              </div>
            )}
          </div>

          {/* AI Ingestion & Processing Details */}
          <ProcessingDetailsPanel
            organizationId={organizationId}
            document={document}
            canManage={canManage}
          />

          {/* AI Vector Embeddings Details */}
          <EmbeddingDetailsPanel
            organizationId={organizationId}
            document={document}
            canManage={canManage}
          />

          {/* SHA-256 Integrity Verification */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                <FileCheck className="w-4 h-4 text-indigo-500" />
                <span>SHA-256 Checksum (Integrity Hash)</span>
              </div>
              <button
                type="button"
                onClick={handleCopyChecksum}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {copiedChecksum ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
              {document.sha256Checksum}
            </p>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {canEdit && document.status === 'active' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(document);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            )}

            {canManage &&
              (document.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onArchive(document);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/40 rounded-lg transition"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRestore(document);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/40 rounded-lg transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore
                </button>
              ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
            >
              Close
            </button>

            {document.status === 'active' && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
