import type { OrganizationRole } from '../../organizations/types/organization.types.js';
import type { DocumentEntity } from '../types/document.types.js';

export const isOrgAdminOrOwner = (role: OrganizationRole): boolean => {
  return role === 'owner' || role === 'admin';
};

export const canViewDocument = (
  _role: OrganizationRole,
  _userId: string,
  _document: DocumentEntity
): boolean => {
  // All active members of the organization are permitted to view active documents
  return true;
};

export const canDownloadDocument = (
  _role: OrganizationRole,
  _userId: string,
  document: DocumentEntity
): boolean => {
  // Archived documents cannot be downloaded
  if (document.archived_at !== null || document.status === 'archived') {
    return false;
  }
  return true;
};

export const canUpdateDocumentMetadata = (
  role: OrganizationRole,
  userId: string,
  document: DocumentEntity
): boolean => {
  if (document.archived_at !== null || document.status === 'archived') {
    return false;
  }
  if (isOrgAdminOrOwner(role)) {
    return true;
  }
  return document.uploaded_by_user_id === userId;
};

export const canArchiveDocument = (role: OrganizationRole): boolean => {
  return isOrgAdminOrOwner(role);
};

export const canRestoreDocument = (role: OrganizationRole): boolean => {
  return isOrgAdminOrOwner(role);
};
