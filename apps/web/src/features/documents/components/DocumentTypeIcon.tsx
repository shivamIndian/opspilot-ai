import React from 'react';
import { FileText, FileCode, File, FileSpreadsheet } from 'lucide-react';
import type { DocumentExtension } from '../types/document.types';
import { getExtensionBadgeTheme } from '../utils/document-formatters';

interface DocumentTypeIconProps {
  extension: DocumentExtension;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DocumentTypeIcon: React.FC<DocumentTypeIconProps> = ({
  extension,
  className = '',
  size = 'md',
}) => {
  const theme = getExtensionBadgeTheme(extension);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  switch (extension) {
    case 'pdf':
      return <FileText className={`${sizeClasses} ${theme.iconColor} ${className}`} />;
    case 'docx':
      return <FileSpreadsheet className={`${sizeClasses} ${theme.iconColor} ${className}`} />;
    case 'md':
      return <FileCode className={`${sizeClasses} ${theme.iconColor} ${className}`} />;
    case 'txt':
    default:
      return <File className={`${sizeClasses} ${theme.iconColor} ${className}`} />;
  }
};
