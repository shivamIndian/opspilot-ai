import { useMutation } from '@tanstack/react-query';
import { knowledgeSearchService } from '../services/knowledge-search.service';
import type { KnowledgeAnswerRequest, KnowledgeAnswerResponse } from '@/types/knowledge';

export function useKnowledgeAnswer(organizationId: string) {
  return useMutation<KnowledgeAnswerResponse, Error, KnowledgeAnswerRequest>({
    mutationFn: params => knowledgeSearchService.generateAnswer(organizationId, params),
  });
}
