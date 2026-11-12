import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Upload, HardDrive, Files, Archive, Layers, Sparkles } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAuth } from '@/hooks/useAuth';
import {
  useDocumentList,
  useArchiveDocument,
  useRestoreDocument,
  useReprocessDocument,
  useReprocessEmbeddings,
} from '../hooks/useDocuments';
import type { SafeDocument, DocumentFilterParams } from '../types/document.types';
import { DocumentFilters } from '../components/DocumentFilters';
import { DocumentTable } from '../components/DocumentTable';
import { DocumentUploadDialog } from '../components/DocumentUploadDialog';
import { DocumentDetailsDialog } from '../components/DocumentDetailsDialog';
import { DocumentEditDialog } from '../components/DocumentEditDialog';
import { formatBytes } from '../utils/document-formatters';

export const DocumentsPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { activeOrganization } = useOrganizations();
  const { user } = useAuth();

  const [filters, setFilters] = useState<DocumentFilterParams>({
    page: 1,
    limit: 20,
    status: 'active',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Modal dialog states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDetailsDoc, setSelectedDetailsDoc] = useState<SafeDocument | null>(null);
  const [selectedEditDoc, setSelectedEditDoc] = useState<SafeDocument | null>(null);

  // Queries and mutations
  const { data: documentData, isLoading, refetch } = useDocumentList(organizationId, filters);

  const archiveMutation = useArchiveDocument(organizationId);
  const restoreMutation = useRestoreDocument(organizationId);
  const reprocessMutation = useReprocessDocument(organizationId);
  const reprocessEmbeddingsMutation = useReprocessEmbeddings(organizationId);

  const handleReprocess = async (doc: SafeDocument) => {
    try {
      await reprocessMutation.mutateAsync(doc.id);
    } catch (err) {
      console.error('Failed to trigger reprocessing:', err);
    }
  };

  const handleReprocessEmbeddings = async (doc: SafeDocument) => {
    try {
      await reprocessEmbeddingsMutation.mutateAsync(doc.id);
    } catch (err) {
      console.error('Failed to trigger embedding reprocessing:', err);
    }
  };

  const handleFilterChange = (newFilters: Partial<DocumentFilterParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      status: 'active',
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  };

  const handleSortChange = (
    sortBy: 'created_at' | 'updated_at' | 'display_name' | 'size_bytes'
  ) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const handleArchive = async (doc: SafeDocument) => {
    if (window.confirm(`Are you sure you want to archive "${doc.displayName}"?`)) {
      try {
        await archiveMutation.mutateAsync(doc.id);
        if (selectedDetailsDoc?.id === doc.id) {
          setSelectedDetailsDoc(null);
        }
      } catch (err) {
        console.error('Failed to archive document:', err);
      }
    }
  };

  const handleRestore = async (doc: SafeDocument) => {
    try {
      await restoreMutation.mutateAsync(doc.id);
      if (selectedDetailsDoc?.id === doc.id) {
        setSelectedDetailsDoc(null);
      }
    } catch (err) {
      console.error('Failed to restore document:', err);
    }
  };

  const userRole = activeOrganization?.role;
  const isAdminOrOwner = userRole === 'owner' || userRole === 'admin';

  // Compute stats from current page or data
  const totalDocs = documentData?.pagination.total || 0;
  const totalSizeBytes =
    documentData?.documents.reduce((acc, d) => acc + (d.sizeBytes || 0), 0) || 0;
  const totalChunks = documentData?.documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0) || 0;
  const totalEmbedded =
    documentData?.documents.reduce((acc, d) => acc + (d.embeddedChunkCount || 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Document Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Secure enterprise repository and document library for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {activeOrganization?.name || 'Workspace'}
            </span>
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Files className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Total Docs</p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {totalDocs}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Storage Used</p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
              {formatBytes(totalSizeBytes)}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Extracted Chunks
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {totalChunks.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Vectors Stored
            </p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {totalEmbedded.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
            <Archive className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Filter Mode</p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 capitalize">
              {filters.status || 'Active'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <DocumentFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Document Data Table */}
      <DocumentTable
        organizationId={organizationId || ''}
        documents={documentData?.documents || []}
        pagination={
          documentData?.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
          }
        }
        isLoading={isLoading}
        onPageChange={page => handleFilterChange({ page })}
        onSortChange={handleSortChange}
        currentSortBy={filters.sortBy}
        currentSortOrder={filters.sortOrder}
        onViewDetails={doc => setSelectedDetailsDoc(doc)}
        onEdit={doc => setSelectedEditDoc(doc)}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onReprocess={handleReprocess}
        onReprocessEmbeddings={handleReprocessEmbeddings}
        currentUserId={user?.id}
        userRole={userRole}
      />

      {/* Upload Dialog Modal */}
      <DocumentUploadDialog
        organizationId={organizationId || ''}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Document Details Modal */}
      <DocumentDetailsDialog
        organizationId={organizationId || ''}
        document={selectedDetailsDoc}
        isOpen={Boolean(selectedDetailsDoc)}
        onClose={() => setSelectedDetailsDoc(null)}
        onEdit={doc => setSelectedEditDoc(doc)}
        onArchive={handleArchive}
        onRestore={handleRestore}
        canManage={isAdminOrOwner}
        canEdit={
          isAdminOrOwner || Boolean(user?.id && selectedDetailsDoc?.uploadedByUserId === user.id)
        }
      />

      {/* Edit Metadata Modal */}
      <DocumentEditDialog
        organizationId={organizationId || ''}
        document={selectedEditDoc}
        isOpen={Boolean(selectedEditDoc)}
        onClose={() => setSelectedEditDoc(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
