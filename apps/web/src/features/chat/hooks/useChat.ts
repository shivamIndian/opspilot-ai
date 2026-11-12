import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../services/chat.service';
import type { ChatMessage } from '../types/chat.types';

export function useConversations(organizationId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return chatService.listConversations(organizationId);
    },
    enabled: Boolean(organizationId),
    staleTime: 10000,
  });

  const createMutation = useMutation({
    mutationFn: ({ title, initialMessage }: { title?: string; initialMessage?: string }) => {
      if (!organizationId) throw new Error('Organization ID is required');
      return chatService.createConversation(organizationId, title, initialMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', organizationId] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) => {
      if (!organizationId) throw new Error('Organization ID is required');
      return chatService.renameConversation(organizationId, conversationId, title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', organizationId] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (conversationId: string) => {
      if (!organizationId) throw new Error('Organization ID is required');
      return chatService.archiveConversation(organizationId, conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', organizationId] });
    },
  });

  return {
    ...query,
    conversations: query.data ?? [],
    createConversation: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    renameConversation: renameMutation.mutateAsync,
    archiveConversation: archiveMutation.mutateAsync,
  };
}

export function useConversationMessages(organizationId?: string, conversationId?: string) {
  return useQuery({
    queryKey: ['messages', organizationId, conversationId],
    queryFn: () => {
      if (!organizationId || !conversationId) throw new Error('Org and Conversation ID are required');
      return chatService.listMessages(organizationId, conversationId);
    },
    enabled: Boolean(organizationId && conversationId),
    staleTime: 5000,
  });
}

export function useSendMessage(organizationId?: string, defaultConversationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, conversationId }: { content: string; conversationId?: string }) => {
      const convId = conversationId || defaultConversationId;
      if (!organizationId || !convId) throw new Error('Org and Conversation ID are required');
      return chatService.sendMessage(organizationId, convId, content);
    },
    onSuccess: (data, variables) => {
      const convId = variables.conversationId || defaultConversationId;
      queryClient.setQueryData<ChatMessage[]>(
        ['messages', organizationId, convId],
        (old = []) => [...old, data.userMessage, data.assistantMessage]
      );
      queryClient.invalidateQueries({ queryKey: ['conversations', organizationId] });
    },
  });
}
