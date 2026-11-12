import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Edit2, Check, X, BrainCircuit, ShieldCheck, PanelLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ChatConversation } from '../types/chat.types';

export interface ChatHeaderProps {
  conversation?: ChatConversation | null;
  organizationId: string;
  onRename?: (newTitle: string) => Promise<void>;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  organizationId,
  onRename,
  onToggleSidebar,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState(conversation?.title || 'New Conversation');

  const handleStartEditing = () => {
    setTitleInput(conversation?.title || 'New Conversation');
    setIsEditing(true);
  };

  const handleSaveRename = async () => {
    if (onRename && titleInput.trim() && titleInput !== conversation?.title) {
      await onRename(titleInput.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setTitleInput(conversation?.title || 'New Conversation');
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
            title="Toggle conversations sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
          <MessageSquare className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="rounded border border-[var(--brand-primary)] bg-[var(--surface-secondary)] px-2 py-0.5 text-xs text-[var(--text-primary)] focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSaveRename}
                className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                title="Save"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleCancelRename}
                className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xs font-bold text-[var(--text-primary)] sm:text-sm">
                {conversation?.title || 'OpsPilot Enterprise Assistant'}
              </h2>
              {conversation && onRename && (
                <button
                  onClick={handleStartEditing}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  title="Rename conversation"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
            <span>LangGraph Engine</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" /> RAG Grounded
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to={`/organizations/${organizationId}/settings/ai-memory`}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
          title="Agent Memory Settings"
        >
          <BrainCircuit className="h-3.5 w-3.5 text-indigo-500" />
          <span>Memory Settings</span>
        </Link>
        <Badge variant="primary" size="sm">
          GPT-4o / LangGraph v1
        </Badge>
      </div>
    </div>
  );
};
