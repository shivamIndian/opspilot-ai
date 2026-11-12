import type { WorkflowCitation, WorkflowActionProposal } from '../../agent-workflows/types/workflow.types.js';

export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'streaming' | 'completed' | 'failed' | 'waiting_approval';

export interface ConversationEntity {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  thread_id: string;
  status: ConversationStatus;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
  last_message?: string | null;
  message_count?: string | number;
}

export interface SafeConversation {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  threadId: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string | null;
  messageCount?: number;
}

export interface ToolActivityItem {
  toolName: string;
  status: 'started' | 'completed' | 'failed';
  summary?: string;
  timestamp?: string;
}

export interface ConversationMessageEntity {
  id: string;
  conversation_id: string;
  organization_id: string;
  user_id: string | null;
  role: MessageRole;
  content: string;
  citations: WorkflowCitation[];
  tool_calls: ToolActivityItem[];
  action_proposals: WorkflowActionProposal[];
  telemetry: Record<string, unknown>;
  status: MessageStatus;
  created_at: Date;
}

export interface SafeConversationMessage {
  id: string;
  conversationId: string;
  organizationId: string;
  userId: string | null;
  role: MessageRole;
  content: string;
  citations: WorkflowCitation[];
  toolCalls: ToolActivityItem[];
  actionProposals: WorkflowActionProposal[];
  telemetry: Record<string, unknown>;
  status: MessageStatus;
  createdAt: string;
}

export interface CreateConversationInput {
  title?: string;
  initialMessage?: string;
}

export interface SendMessageInput {
  content: string;
  workflowVersion?: string;
  correlationId?: string;
}

export interface UpdateConversationInput {
  title: string;
}
