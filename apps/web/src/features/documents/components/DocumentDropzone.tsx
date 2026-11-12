import React, { useRef, useState } from 'react';
import { UploadCloud, AlertCircle, File, X } from 'lucide-react';
import { formatBytes } from '../utils/document-formatters';

interface DocumentDropzoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  uploadProgress?: number | null;
  disabled?: boolean;
}

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md'];
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const DocumentDropzone: React.FC<DocumentDropzoneProps> = ({
  onFileSelect,
  selectedFile,
  uploadProgress = null,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage(
        `Invalid file format (.${ext || 'unknown'}). Supported formats: ${ALLOWED_EXTENSIONS.map(e => `.${e}`).join(', ')}`
      );
      onFileSelect(null);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${formatBytes(file.size)}). Maximum allowed size is 25 MB.`
      );
      onFileSelect(null);
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'
            : isDragOver
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
              : selectedFile
                ? 'border-emerald-400 bg-emerald-50/20 dark:border-emerald-700/60 dark:bg-emerald-950/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/30'
        }`}
      >
        {selectedFile ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <File className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatBytes(selectedFile.size)}
                </p>
              </div>
            </div>

            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Click to browse or drag and drop a file
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Supported formats: PDF, DOCX, TXT, MD (up to 25 MB)
              </p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {uploadProgress !== null && (
          <div className="w-full mt-4 space-y-1">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Uploading to secure private storage...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Client error message */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
