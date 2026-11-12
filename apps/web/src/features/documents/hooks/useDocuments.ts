import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../services/document.service';
import type {
  DocumentFilterParams,
  DocumentUploadPayload,
  DocumentUpdatePayload,
} from '../types/document.types';

export const useDocumentList = (
  organizationId: string | undefined,
  params: DocumentFilterParams = {}
) => {
  return useQuery({
    queryKey: ['documents', organizationId, params],
    queryFn: () => documentService.listDocuments(organizationId!, params),
    enabled: Boolean(organizationId),
  });
};

export const useDocumentDetails = (
  organizationId: string | undefined,
  documentId: string | undefined
) => {
  return useQuery({
    queryKey: ['document', organizationId, documentId],
    queryFn: () => documentService.getDocument(organizationId!, documentId!),
    enabled: Boolean(organizationId && documentId),
  });
};

export const useUploadDocument = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      onProgress,
    }: {
      payload: DocumentUploadPayload;
      onProgress?: (percent: number) => void;
    }) => documentService.uploadDocument(organizationId!, payload, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
    },
  });
};

export const useUpdateDocument = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, payload }: { documentId: string; payload: DocumentUpdatePayload }) =>
      documentService.updateDocument(organizationId!, documentId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['document', organizationId, variables.documentId],
      });
    },
  });
};

export const useArchiveDocument = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      documentService.archiveDocument(organizationId!, documentId),
    onSuccess: (_data, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['document', organizationId, documentId],
      });
    },
  });
};

export const useRestoreDocument = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      documentService.restoreDocument(organizationId!, documentId),
    onSuccess: (_data, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['document', organizationId, documentId],
      });
    },
  });
};

export const useDocumentProcessingStatus = (
  organizationId: string | undefined,
  documentId: string | undefined
) => {
  return useQuery({
    queryKey: ['document-processing', organizationId, documentId],
    queryFn: () => documentService.getProcessingStatus(organizationId!, documentId!),
    enabled: Boolean(organizationId && documentId),
    refetchInterval: query => {
      const status = query.state.data?.status;
      // Poll dynamically every 2.5s if currently queued or in-progress
      if (status === 'queued' || status === 'processing') {
        return 2500;
      }
      return false;
    },
  });
};

export const useReprocessDocument = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      documentService.reprocessDocument(organizationId!, documentId),
    onSuccess: (_data, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['document', organizationId, documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['document-processing', organizationId, documentId],
      });
    },
  });
};

export const useDocumentEmbeddingStatus = (
  organizationId: string | undefined,
  documentId: string | undefined
) => {
  return useQuery({
    queryKey: ['document-embedding', organizationId, documentId],
    queryFn: () => documentService.getEmbeddingStatus(organizationId!, documentId!),
    enabled: Boolean(organizationId && documentId),
    refetchInterval: query => {
      const status = query.state.data?.status;
      // Poll dynamically every 2.5s if currently queued or in-progress
      if (status === 'queued' || status === 'processing') {
        return 2500;
      }
      return false;
    },
  });
};

export const useReprocessEmbeddings = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      documentService.reprocessEmbeddings(organizationId!, documentId),
    onSuccess: (_data, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
      queryClient.invalidateQueries({
        queryKey: ['document', organizationId, documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['document-embedding', organizationId, documentId],
      });
    },
  });
};
