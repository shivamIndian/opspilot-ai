import { apiClient } from '@/services/api';
import type { ApiResponse } from '@/types';
import type {
  SafeAgentMemory,
  MemorySettings,
  MemoryCandidateProposal,
  MemoryFilterParams,
  CreateMemoryInput,
  UpdateMemoryInput,
  UpdateMemorySettingsInput,
} from '../types/memory.types';

export const memoryService = {
  async listMemories(
    organizationId: string,
    params: MemoryFilterParams = {}
  ): Promise<{ items: SafeAgentMemory[]; total: number; limit: number; offset: number }> {
    const res = await apiClient.get<
      ApiResponse<{ items: SafeAgentMemory[]; total: number; limit: number; offset: number }>
    >(`/organizations/${organizationId}/agent/memories`, { params });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to list memories');
    }
    return res.data.data;
  },

  async createMemory(
    organizationId: string,
    input: CreateMemoryInput
  ): Promise<SafeAgentMemory> {
    const res = await apiClient.post<ApiResponse<SafeAgentMemory>>(
      `/organizations/${organizationId}/agent/memories`,
      input
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to create memory');
    }
    return res.data.data;
  },

  async getMemory(
    organizationId: string,
    memoryId: string
  ): Promise<SafeAgentMemory> {
    const res = await apiClient.get<ApiResponse<SafeAgentMemory>>(
      `/organizations/${organizationId}/agent/memories/${memoryId}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch memory');
    }
    return res.data.data;
  },

  async updateMemory(
    organizationId: string,
    memoryId: string,
    input: UpdateMemoryInput
  ): Promise<SafeAgentMemory> {
    const res = await apiClient.patch<ApiResponse<SafeAgentMemory>>(
      `/organizations/${organizationId}/agent/memories/${memoryId}`,
      input
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to update memory');
    }
    return res.data.data;
  },

  async deleteMemory(
    organizationId: string,
    memoryId: string
  ): Promise<{ success: boolean; id: string }> {
    const res = await apiClient.delete<ApiResponse<{ success: boolean; id: string }>>(
      `/organizations/${organizationId}/agent/memories/${memoryId}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to delete memory');
    }
    return res.data.data;
  },

  async bulkPurgeMemories(
    organizationId: string
  ): Promise<{ deleted_count: number; user_id: string; organization_id: string }> {
    const res = await apiClient.delete<
      ApiResponse<{ deleted_count: number; user_id: string; organization_id: string }>
    >(`/organizations/${organizationId}/agent/memories`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to purge memories');
    }
    return res.data.data;
  },

  async getSettings(organizationId: string): Promise<MemorySettings> {
    const res = await apiClient.get<ApiResponse<MemorySettings>>(
      `/organizations/${organizationId}/agent/memory-settings`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to load memory settings');
    }
    return res.data.data;
  },

  async updateSettings(
    organizationId: string,
    input: UpdateMemorySettingsInput
  ): Promise<MemorySettings> {
    const res = await apiClient.patch<ApiResponse<MemorySettings>>(
      `/organizations/${organizationId}/agent/memory-settings`,
      input
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to update memory settings');
    }
    return res.data.data;
  },

  async searchMemories(
    organizationId: string,
    query: string,
    options: { memory_type?: string; top_k?: number; similarity_threshold?: number } = {}
  ): Promise<{ results: Array<{ memory: SafeAgentMemory; score: number; citation_text: string }>; total: number }> {
    const res = await apiClient.post<
      ApiResponse<{ results: Array<{ memory: SafeAgentMemory; score: number; citation_text: string }>; total: number }>
    >(`/organizations/${organizationId}/agent/memories/search`, {
      query,
      ...options,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Memory search failed');
    }
    return res.data.data;
  },

  async extractSuggestions(
    organizationId: string,
    conversationId: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<{ candidates: MemoryCandidateProposal[]; conversation_id: string; detected_count: number }> {
    const res = await apiClient.post<
      ApiResponse<{ candidates: MemoryCandidateProposal[]; conversation_id: string; detected_count: number }>
    >(`/organizations/${organizationId}/agent/memories/suggestions`, {
      conversation_id: conversationId,
      messages,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to extract memory suggestions');
    }
    return res.data.data;
  },
};
