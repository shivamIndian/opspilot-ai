import {
  aiMemoryClient,
  AiMemoryClient,
} from '../client/ai-memory.client.js';
import { logger } from '../../../utils/logger.js';
import type {
  MemoryCreateInput,
  MemoryUpdateInput,
  MemoryResponse,
  MemoryListResponse,
  MemorySettingsResponse,
  MemorySettingsUpdateInput,
  MemorySearchResponse,
  MemoryCandidateListResponse,
} from '../types/agent-memory.types.js';

export class AgentMemoryPrivacyError extends Error {
  constructor(
    message: string = 'Users may only access and manage their own personal agent memories',
    public errorCode: string = 'MEMORY_ACCESS_DENIED',
    public status: number = 403
  ) {
    super(message);
    this.name = 'AgentMemoryPrivacyError';
  }
}

export class AgentMemoryService {
  constructor(private client: AiMemoryClient = aiMemoryClient) {}

  /**
   * Enforces privacy boundary: prevents users or admins from accessing other users' memories.
   */
  private assertUserOwnership(requesterUserId: string, targetUserId: string): void {
    if (requesterUserId !== targetUserId) {
      logger.warn(
        `[AgentMemoryService] Privacy violation: User ${requesterUserId} attempted to access memory belonging to user ${targetUserId}`
      );
      throw new AgentMemoryPrivacyError(
        'Users may only access and manage their own personal agent memories',
        'MEMORY_ACCESS_DENIED',
        403
      );
    }
  }

  async listMemories(
    organizationId: string,
    requesterUserId: string,
    targetUserId: string,
    params: { memory_type?: string; status?: string; limit?: number; offset?: number } = {}
  ): Promise<MemoryListResponse> {
    this.assertUserOwnership(requesterUserId, targetUserId);
    return this.client.listMemories(organizationId, targetUserId, params);
  }

  async createMemory(
    organizationId: string,
    requesterUserId: string,
    targetUserId: string,
    input: MemoryCreateInput
  ): Promise<MemoryResponse> {
    this.assertUserOwnership(requesterUserId, targetUserId);
    return this.client.createMemory(organizationId, targetUserId, input);
  }

  async getMemory(
    organizationId: string,
    requesterUserId: string,
    targetUserId: string,
    memoryId: string
  ): Promise<MemoryResponse> {
    this.assertUserOwnership(requesterUserId, targetUserId);
    return this.client.getMemory(organizationId, targetUserId, memoryId);
  }

  async updateMemory(
    organizationId: string,
    requesterUserId: string,
    targetUserId: string,
    memoryId: string,
    input: MemoryUpdateInput
  ): Promise<MemoryResponse> {
    this.assertUserOwnership(requesterUserId, targetUserId);
    return this.client.updateMemory(organizationId, targetUserId, memoryId, input);
  }

  async deleteMemory(
    organizationId: string,
    requesterUserId: string,
    targetUserId: string,
    memoryId: string
  ): Promise<{ success: boolean; id: string }> {
    this.assertUserOwnership(requesterUserId, targetUserId);
    return this.client.deleteMemory(organizationId, targetUserId, memoryId);
  }

  async bulkPurgeMemories(
    organizationId: string,
    requesterUserId: string,
    targetUserId: string
  ): Promise<{ deleted_count: number; user_id: string; organization_id: string; status: string }> {
    this.assertUserOwnership(requesterUserId, targetUserId);
    return this.client.bulkPurgeMemories(organizationId, targetUserId);
  }

  async getSettings(
    organizationId: string,
    requesterUserId: string,
    targetUserId: string
  ): Promise<MemorySettingsResponse> {
    this.assertUserOwnership(requesterUserId, targetUserId);
    return this.client.getSettings(organizationId, targetUserId);
  }

  async updateSettings(
    organizationId: string,
    requesterUserId: string,
    targetUserId: string,
    input: MemorySettingsUpdateInput
  ): Promise<MemorySettingsResponse> {
    this.assertUserOwnership(requesterUserId, targetUserId);
    return this.client.updateSettings(organizationId, targetUserId, input);
  }

  async searchMemories(
    organizationId: string,
    requesterUserId: string,
    targetUserId: string,
    query: string,
    options: { memory_type?: string; top_k?: number; similarity_threshold?: number } = {}
  ): Promise<MemorySearchResponse> {
    this.assertUserOwnership(requesterUserId, targetUserId);
    return this.client.searchMemories(organizationId, targetUserId, query, options);
  }

  async extractSuggestions(
    organizationId: string,
    requesterUserId: string,
    targetUserId: string,
    conversationId: string,
    messages: Array<{ role: string; content: string }>,
    workflowContext?: Record<string, unknown>
  ): Promise<MemoryCandidateListResponse> {
    this.assertUserOwnership(requesterUserId, targetUserId);
    return this.client.extractSuggestions(
      organizationId,
      targetUserId,
      conversationId,
      messages,
      workflowContext
    );
  }
}

export const agentMemoryService = new AgentMemoryService();
