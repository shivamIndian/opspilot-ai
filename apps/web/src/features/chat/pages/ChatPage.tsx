import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useConversations, useConversationMessages, useSendMessage } from '../hooks/useChat';
import { ChatSidebar } from '../components/ChatSidebar';
import { ChatHeader } from '../components/ChatHeader';
import { MessageBubble } from '../components/MessageBubble';
import { MessageComposer } from '../components/MessageComposer';
import { ChatEmptyState } from '../components/ChatEmptyState';
import { Alert } from '@/components/ui/Alert';

export const ChatPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();

  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const {
    conversations,
    createConversation,
    renameConversation,
    archiveConversation,
  } = useConversations(organizationId);

  // Set default active conversation when conversations load
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const {
    data: messages = [],
    isLoading: isLoadingMessages,
  } = useConversationMessages(organizationId, activeConversationId);

  const sendMessageMutation = useSendMessage(organizationId, activeConversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendMessageMutation.isPending]);

  const handleNewConversation = async () => {
    try {
      setErrorBanner(null);
      const res = await createConversation({ title: 'New Conversation' });
      setActiveConversationId(res.conversation.id);
      setIsMobileSidebarOpen(false);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to create conversation');
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      setErrorBanner(null);
      let targetConvId = activeConversationId || conversations[0]?.id;

      if (!targetConvId) {
        const res = await createConversation({ title: 'New Conversation' });
        targetConvId = res.conversation.id;
        setActiveConversationId(targetConvId);
      }

      await sendMessageMutation.mutateAsync({ content, conversationId: targetConvId });
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const handleRename = async (newTitle: string) => {
    if (activeConversationId) {
      await renameConversation({ conversationId: activeConversationId, title: newTitle });
    }
  };

  const handleDelete = async (convId: string) => {
    await archiveConversation(convId);
    if (activeConversationId === convId) {
      const remaining = conversations.filter((c) => c.id !== convId);
      setActiveConversationId(remaining[0]?.id);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] overflow-hidden shadow-sm animate-in fade-in duration-200">
      {/* Sidebar for Desktop */}
      <div className="hidden md:block h-full">
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => setActiveConversationId(id)}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDelete}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/40 backdrop-blur-sm">
          <ChatSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => setActiveConversationId(id)}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDelete}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
          <div className="flex-1" onClick={() => setIsMobileSidebarOpen(false)} />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Chat Header */}
        <ChatHeader
          conversation={activeConversation}
          organizationId={organizationId || ''}
          onRename={handleRename}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isSidebarOpen={isMobileSidebarOpen}
        />

        {/* Error notification banner */}
        {errorBanner && (
          <div className="p-3 border-b border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20">
            <Alert variant="error" title="Chat Error" dismissible onDismiss={() => setErrorBanner(null)}>
              {errorBanner}
            </Alert>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-48 text-sm text-[var(--text-tertiary)] animate-pulse">
              Loading conversation messages...
            </div>
          ) : messages.length > 0 ? (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  organizationId={organizationId || ''}
                />
              ))}
              {sendMessageMutation.isPending && (
                <div className="flex items-center gap-2 p-3 text-xs text-[var(--text-tertiary)] italic animate-pulse">
                  <span>OpsPilot Assistant is searching knowledge and generating response...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <ChatEmptyState onSelectPrompt={(prompt) => handleSendMessage(prompt)} />
          )}
        </div>

        {/* Message Composer Footer */}
        <div className="border-t border-[var(--border-default)] p-3 sm:p-4 bg-[var(--surface-primary)]">
          <MessageComposer
            onSend={handleSendMessage}
            isGenerating={sendMessageMutation.isPending}
            disabled={!organizationId}
          />
        </div>
      </div>
    </div>
  );
};
