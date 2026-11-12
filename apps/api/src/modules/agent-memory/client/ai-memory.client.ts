import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import type {
  MemoryResponse,
  MemoryListResponse,
  MemorySettingsResponse,
  MemorySettingsUpdateInput,
  MemoryCreateInput,
  MemoryUpdateInput,
  MemorySearchResponse,
  MemoryCandidateListResponse,
} from '../types/agent-memory.types.js';

export class AiMemoryClientError extends Error {
  constructor(
    message: string,
    public errorCode: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AiMemoryClientError';
  }
}

export class AiMemoryClient {
  private baseUrl: string;
  private internalToken: string;

  constructor(
    aiServiceUrl: string = config.AI_SERVICE_URL,
    internalToken: string = config.AI_SERVICE_INTERNAL_TOKEN
  ) {
    this.baseUrl = aiServiceUrl.replace(/\/+$/, '');
    this.internalToken = internalToken;
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      params?: Record<string, string | number | undefined>;
      body?: unknown;
    } = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (options.params) {
      for (const [key, val] of Object.entries(options.params)) {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      }
    }

    const headers: Record<string, string> = {
      'x-internal-service-token': this.internalToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers,
    };

    if (options.body && options.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), fetchOptions);
    } catch (err) {
      logger.error(`[AiMemoryClient] Network error connecting to AI service at ${url.toString()}:`, err);
      throw new AiMemoryClientError(
        'Failed to connect to AI Memory service',
        'AI_MEMORY_UNAVAILABLE',
        503,
        err instanceof Error ? err.message : String(err)
      );
    }

    if (!response.ok) {
      let errorBody: any = {};
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { message: await response.text() };
      }

      const detail = errorBody.detail || errorBody;
      const errorCode = detail.code || errorBody.code || 'AI_MEMORY_ERROR';
      const message = detail.message || errorBody.message || `AI Memory error: ${response.statusText}`;

      logger.warn(`[AiMemoryClient] AI service returned error (${response.status}): ${message}`, {
        errorCode,
        status: response.status,
      });

      throw new AiMemoryClientError(message, errorCode, response.status, detail);
    }

    return (await response.json()) as T;
  }

  async listMemories(
    organizationId: string,
    userId: string,
    params: { memory_type?: string; status?: string; limit?: number; offset?: number } = {}
  ): Promise<MemoryListResponse> {
    return this.request<MemoryListResponse>('/internal/v1/agent/memory/memories', {
      method: 'GET',
      params: {
        organization_id: organizationId,
        user_id: userId,
        ...params,
      },
    });
  }

  async createMemory(
    organizationId: string,
    userId: string,
    input: MemoryCreateInput
  ): Promise<MemoryResponse> {
    return this.request<MemoryResponse>('/internal/v1/agent/memory/memories', {
      method: 'POST',
      params: { organization_id: organizationId, user_id: userId },
      body: input,
    });
  }

  async getMemory(
    organizationId: string,
    userId: string,
    memoryId: string
  ): Promise<MemoryResponse> {
    return this.request<MemoryResponse>(`/internal/v1/agent/memory/memories/${memoryId}`, {
      method: 'GET',
      params: { organization_id: organizationId, user_id: userId },
    });
  }

  async updateMemory(
    organizationId: string,
    userId: string,
    memoryId: string,
    input: MemoryUpdateInput
  ): Promise<MemoryResponse> {
    return this.request<MemoryResponse>(`/internal/v1/agent/memory/memories/${memoryId}`, {
      method: 'PATCH',
      params: { organization_id: organizationId, user_id: userId },
      body: input,
    });
  }

  async deleteMemory(
    organizationId: string,
    userId: string,
    memoryId: string
  ): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(
      `/internal/v1/agent/memory/memories/${memoryId}`,
      {
        method: 'DELETE',
        params: { organization_id: organizationId, user_id: userId },
      }
    );
  }

  async bulkPurgeMemories(
    organizationId: string,
    userId: string
  ): Promise<{ deleted_count: number; user_id: string; organization_id: string; status: string }> {
    return this.request<{
      deleted_count: number;
      user_id: string;
      organization_id: string;
      status: string;
    }>('/internal/v1/agent/memory/memories', {
      method: 'DELETE',
      params: { organization_id: organizationId, user_id: userId },
    });
  }

  async getSettings(organizationId: string, userId: string): Promise<MemorySettingsResponse> {
    return this.request<MemorySettingsResponse>('/internal/v1/agent/memory/settings', {
      method: 'GET',
      params: { organization_id: organizationId, user_id: userId },
    });
  }

  async updateSettings(
    organizationId: string,
    userId: string,
    input: MemorySettingsUpdateInput
  ): Promise<MemorySettingsResponse> {
    return this.request<MemorySettingsResponse>('/internal/v1/agent/memory/settings', {
      method: 'PATCH',
      params: { organization_id: organizationId, user_id: userId },
      body: input,
    });
  }

  async searchMemories(
    organizationId: string,
    userId: string,
    query: string,
    options: { memory_type?: string; top_k?: number; similarity_threshold?: number } = {}
  ): Promise<MemorySearchResponse> {
    return this.request<MemorySearchResponse>('/internal/v1/agent/memory/search', {
      method: 'POST',
      params: { organization_id: organizationId, user_id: userId },
      body: {
        query,
        ...options,
      },
    });
  }

  async extractSuggestions(
    organizationId: string,
    userId: string,
    conversationId: string,
    messages: Array<{ role: string; content: string }>,
    workflowContext?: Record<string, unknown>
  ): Promise<MemoryCandidateListResponse> {
    return this.request<MemoryCandidateListResponse>('/internal/v1/agent/memory/suggestions', {
      method: 'POST',
      params: { organization_id: organizationId, user_id: userId },
      body: {
        conversation_id: conversationId,
        messages,
        workflow_context: workflowContext,
      },
    });
  }
}

export const aiMemoryClient = new AiMemoryClient();
