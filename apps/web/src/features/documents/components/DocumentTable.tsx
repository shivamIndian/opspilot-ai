import React, { useState } from 'react';
import {
  Download,
  Eye,
  Edit2,
  Archive,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  FileQuestion,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { SafeDocument, DocumentPagination } from '../types/document.types';
import { DocumentTypeIcon } from './DocumentTypeIcon';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { ProcessingStatusBadge } from './ProcessingStatusBadge';
import { EmbeddingStatusBadge } from './EmbeddingStatusBadge';
import {
  formatBytes,
  formatDocumentDate,
  getExtensionBadgeTheme,
} from '../utils/document-formatters';
import { documentService } from '../services/document.service';

interface DocumentTableProps {
  organizationId: string;
  documents: SafeDocument[];
  pagination: DocumentPagination;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: 'created_at' | 'updated_at' | 'display_name' | 'size_bytes') => void;
  currentSortBy?: string;
  currentSortOrder?: 'asc' | 'desc';
  onViewDetails: (doc: SafeDocument) => void;
  onEdit: (doc: SafeDocument) => void;
  onArchive: (doc: SafeDocument) => void;
  onRestore: (doc: SafeDocument) => void;
  onReprocess?: (doc: SafeDocument) => void;
  onReprocessEmbeddings?: (doc: SafeDocument) => void;
  currentUserId?: string;
  userRole?: string;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  organizationId,
  documents,
  pagination,
  isLoading,
  onPageChange,
  onSortChange,
  currentSortBy,
  currentSortOrder,
  onViewDetails,
  onEdit,
  onArchive,
  onRestore,
  onReprocess,
  onReprocessEmbeddings,
  currentUserId,
  userRole,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const isAdminOrOwner = userRole === 'owner' || userRole === 'admin';

  const handleDownload = async (e: React.MouseEvent, doc: SafeDocument) => {
    e.stopPropagation();
    setDownloadingId(doc.id);
    try {
      await documentService.downloadDocument(organizationId, doc.id, doc.originalFilename);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading documents...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No documents found
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          There are no documents matching your selected filters or this organization has not
          uploaded any files yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => onSortChange('display_name')}
                  className={`inline-flex items-center gap-1 transition ${
                    currentSortBy === 'display_name'
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Document Name
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  {currentSortBy === 'display_name' && (
                    <span className="text-[10px]">{currentSortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => onSortChange('size_bytes')}
                  className={`inline-flex items-center gap-1 transition ${
                    currentSortBy === 'size_bytes'
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Size
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  {currentSortBy === 'size_bytes' && (
                    <span className="text-[10px]">{currentSortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="py-3 px-4">Uploaded By</th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => onSortChange('created_at')}
                  className={`inline-flex items-center gap-1 transition ${
                    currentSortBy === 'created_at'
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Date
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  {currentSortBy === 'created_at' && (
                    <span className="text-[10px]">{currentSortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {documents.map(doc => {
              const badgeTheme = getExtensionBadgeTheme(doc.fileExtension);
              const canEditThis =
                doc.status === 'active' &&
                (isAdminOrOwner || (currentUserId && doc.uploadedByUserId === currentUserId));

              return (
                <tr
                  key={doc.id}
                  onClick={() => onViewDetails(doc)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  {/* Name & Icon */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                        <DocumentTypeIcon extension={doc.fileExtension} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {doc.displayName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-xs">
                            {doc.originalFilename}
                          </p>
                          {doc.chunkCount != null && doc.chunkCount > 0 && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                              • {doc.chunkCount} chunks
                            </span>
                          )}
                          {doc.embeddedChunkCount != null && doc.embeddedChunkCount > 0 && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              • {doc.embeddedChunkCount} embedded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Extension Tag */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${badgeTheme.badgeClasses}`}
                    >
                      {doc.fileExtension}
                    </span>
                  </td>

                  {/* Size */}
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {formatBytes(doc.sizeBytes)}
                  </td>

                  {/* Uploader */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {doc.uploader?.name || 'Unknown User'}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                    {formatDocumentDate(doc.createdAt)}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <DocumentStatusBadge status={doc.status} />
                      {doc.processingStatus && (
                        <ProcessingStatusBadge status={doc.processingStatus} />
                      )}
                      {doc.embeddingStatus && <EmbeddingStatusBadge status={doc.embeddingStatus} />}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      {/* View Details */}
                      <button
                        type="button"
                        onClick={() => onViewDetails(doc)}
                        title="View Details"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Download */}
                      {doc.status === 'active' && (
                        <button
                          type="button"
                          onClick={e => handleDownload(e, doc)}
                          disabled={downloadingId === doc.id}
                          title="Download Document"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Edit */}
                      {canEditThis && (
                        <button
                          type="button"
                          onClick={() => onEdit(doc)}
                          title="Edit Metadata"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Reprocess Extraction Pipeline */}
                      {isAdminOrOwner && doc.status === 'active' && onReprocess && (
                        <button
                          type="button"
                          onClick={() => onReprocess(doc)}
                          title="Reprocess Extraction Pipeline"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Reprocess Embeddings */}
                      {isAdminOrOwner &&
                        doc.status === 'active' &&
                        doc.processingStatus === 'completed' &&
                        onReprocessEmbeddings && (
                          <button
                            type="button"
                            onClick={() => onReprocessEmbeddings(doc)}
                            title="Regenerate Vector Embeddings"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        )}

                      {/* Archive / Restore */}
                      {isAdminOrOwner &&
                        (doc.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => onArchive(doc)}
                            title="Archive Document"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRestore(doc)}
                            title="Restore Document"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {documents.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {pagination.total}
            </span>{' '}
            documents
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
