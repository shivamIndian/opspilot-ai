import React, { useState } from 'react';
import { Plus, Search, MessageSquare, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ChatConversation } from '../types/chat.types';

export interface ChatSidebarProps {
  conversations: ChatConversation[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onCloseMobile?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onCloseMobile,
}) => {
  const [search, setSearch] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  return (
    <div className="flex h-full w-72 flex-col border-r border-[var(--border-default)] bg-[var(--surface-secondary)]">
      {/* Header with New Chat CTA */}
      <div className="p-3 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-2 md:hidden">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Conversations</span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Conversation</span>
        </Button>

        {/* Filter search */}
        <div className="relative mt-2.5">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] pl-8 pr-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((c) => {
            const isActive = c.id === activeConversationId;
            return (
              <div
                key={c.id}
                onClick={() => {
                  onSelectConversation(c.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`group flex items-center justify-between rounded-lg p-2.5 text-xs cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] font-semibold border border-[var(--brand-primary)]/40 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <MessageSquare className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-tertiary)]'}`} />
                  <div className="min-w-0">
                    <div className="truncate">{c.title}</div>
                    {c.lastMessage && (
                      <div className="truncate text-[10px] text-[var(--text-tertiary)] font-normal">
                        {c.lastMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[10px] text-[var(--text-tertiary)] group-hover:hidden">
                    {formatRelativeTime(c.updatedAt)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Archive conversation "${c.title}"?`)) {
                        onDeleteConversation(c.id);
                      }
                    }}
                    className="hidden group-hover:block rounded p-1 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                    title="Archive conversation"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-xs text-[var(--text-tertiary)]">
            {search ? 'No matching conversations' : 'No conversations yet'}
          </div>
        )}
      </div>
    </div>
  );
};
