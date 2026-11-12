import React, { useState } from 'react';
import { X, Upload, Loader2, AlertCircle } from 'lucide-react';
import { DocumentDropzone } from './DocumentDropzone';
import { useUploadDocument } from '../hooks/useDocuments';

interface DocumentUploadDialogProps {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DocumentUploadDialog: React.FC<DocumentUploadDialogProps> = ({
  organizationId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadMutation = useUploadDocument(organizationId);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (selectedFile && !displayName) {
      // Default display name to file name without extension
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
      setDisplayName(nameWithoutExt);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setErrorMessage(null);
    setUploadProgress(0);

    try {
      await uploadMutation.mutateAsync({
        payload: {
          file,
          displayName: displayName.trim() || file.name,
          description: description.trim() || undefined,
        },
        onProgress: percent => {
          setUploadProgress(percent);
        },
      });

      // Reset and close
      setFile(null);
      setDisplayName('');
      setDescription('');
      setUploadProgress(null);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setUploadProgress(null);
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Upload failed. Please try again.';
      setErrorMessage(msg);
    }
  };

  const handleClose = () => {
    if (uploadMutation.isPending) return;
    setFile(null);
    setDisplayName('');
    setDescription('');
    setUploadProgress(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Upload Document
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Files are securely stored in private storage and encrypted at rest.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Dropzone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Select Document <span className="text-rose-500">*</span>
            </label>
            <DocumentDropzone
              onFileSelect={handleFileSelect}
              selectedFile={file}
              uploadProgress={uploadProgress}
              disabled={uploadMutation.isPending}
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Employee Handbook 2026"
              maxLength={255}
              disabled={uploadMutation.isPending}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief context or summary about this document..."
              rows={3}
              maxLength={5000}
              disabled={uploadMutation.isPending}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploadMutation.isPending}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploadMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
