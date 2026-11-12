import type { DocumentExtension } from '../types/document.types';

export const formatBytes = (bytes: number, decimals = 1): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
};

export const formatDocumentDate = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '—';
  }
};

export const getExtensionBadgeTheme = (
  ext: DocumentExtension
): { label: string; badgeClasses: string; iconColor: string } => {
  switch (ext) {
    case 'pdf':
      return {
        label: 'PDF',
        badgeClasses:
          'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
        iconColor: 'text-rose-500',
      };
    case 'docx':
      return {
        label: 'DOCX',
        badgeClasses:
          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
        iconColor: 'text-blue-500',
      };
    case 'md':
      return {
        label: 'MD',
        badgeClasses:
          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
        iconColor: 'text-amber-500',
      };
    case 'txt':
    default:
      return {
        label: 'TXT',
        badgeClasses:
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        iconColor: 'text-slate-400',
      };
  }
};
