import { useMutation } from '@tanstack/react-query';
import { knowledgeSearchService } from '../services/knowledge-search.service';
import type { KnowledgeSearchRequest, KnowledgeSearchResponse } from '@/types/knowledge';

export const useKnowledgeSearch = (organizationId?: string) => {
  return useMutation<KnowledgeSearchResponse, Error, KnowledgeSearchRequest>({
    mutationFn: (params: KnowledgeSearchRequest) => {
      if (!organizationId) {
        throw new Error('Organization ID is required for knowledge search');
      }
      return knowledgeSearchService.searchKnowledge(organizationId, params);
    },
  });
};
