import { apiClient } from '@/services/api';
import type {
  KnowledgeSearchRequest,
  KnowledgeSearchResponse,
  KnowledgeAnswerRequest,
  KnowledgeAnswerResponse,
} from '@/types/knowledge';

export const knowledgeSearchService = {
  /**
   * Submits a natural-language search query to retrieve relevant document passages.
   */
  async searchKnowledge(
    organizationId: string,
    params: KnowledgeSearchRequest
  ): Promise<KnowledgeSearchResponse> {
    const response = await apiClient.post<{ success: boolean; data: KnowledgeSearchResponse }>(
      `/organizations/${organizationId}/knowledge/search`,
      params
    );
    return response.data.data;
  },

  /**
   * Submits a query to generate an evidence-grounded AI answer with source citations (Module 10).
   */
  async generateAnswer(
    organizationId: string,
    params: KnowledgeAnswerRequest
  ): Promise<KnowledgeAnswerResponse> {
    const response = await apiClient.post<{ success: boolean; data: KnowledgeAnswerResponse }>(
      `/organizations/${organizationId}/knowledge/answer`,
      params
    );
    return response.data.data;
  },
};
