import { apiClient } from '@/services/api';
import type { ChatConversation, ChatMessage } from '../types/chat.types';

export const chatService = {
  async listConversations(organizationId: string): Promise<ChatConversation[]> {
    const res = await apiClient.get<{ success: boolean; data: ChatConversation[] }>(
      `/organizations/${organizationId}/conversations`
    );
    return res.data.data;
  },

  async getConversation(organizationId: string, conversationId: string): Promise<ChatConversation> {
    const res = await apiClient.get<{ success: boolean; data: ChatConversation }>(
      `/organizations/${organizationId}/conversations/${conversationId}`
    );
    return res.data.data;
  },

  async createConversation(
    organizationId: string,
    title?: string,
    initialMessage?: string
  ): Promise<{
    conversation: ChatConversation;
    initialMessages?: { userMessage: ChatMessage; assistantMessage: ChatMessage };
  }> {
    const res = await apiClient.post<{
      success: boolean;
      data: {
        conversation: ChatConversation;
        initialMessages?: { userMessage: ChatMessage; assistantMessage: ChatMessage };
      };
    }>(
      `/organizations/${organizationId}/conversations`,
      { title, initialMessage },
      { timeout: 120000 }
    );
    return res.data.data;
  },

  async renameConversation(
    organizationId: string,
    conversationId: string,
    title: string
  ): Promise<ChatConversation> {
    const res = await apiClient.patch<{ success: boolean; data: ChatConversation }>(
      `/organizations/${organizationId}/conversations/${conversationId}`,
      { title }
    );
    return res.data.data;
  },

  async archiveConversation(organizationId: string, conversationId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/conversations/${conversationId}`);
  },

  async listMessages(organizationId: string, conversationId: string): Promise<ChatMessage[]> {
    const res = await apiClient.get<{ success: boolean; data: ChatMessage[] }>(
      `/organizations/${organizationId}/conversations/${conversationId}/messages`
    );
    return res.data.data;
  },

  async sendMessage(
    organizationId: string,
    conversationId: string,
    content: string
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const res = await apiClient.post<{
      success: boolean;
      data: { userMessage: ChatMessage; assistantMessage: ChatMessage };
    }>(
      `/organizations/${organizationId}/conversations/${conversationId}/messages`,
      { content },
      { timeout: 120000 }
    );
    return res.data.data;
  },
};
