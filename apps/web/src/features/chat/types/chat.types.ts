export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'streaming' | 'completed' | 'failed' | 'waiting_approval';

export interface ChatCitation {
  chunk_id: string;
  document_id: string;
  filename: string;
  score: number;
  snippet: string;
}

export interface ChatToolActivity {
  toolName: string;
  status: 'started' | 'completed' | 'failed';
  summary?: string;
  timestamp?: string;
}

export interface ChatActionProposal {
  proposal_id: string;
  tool_name: string;
  action_type?: string;
  risk_level: string;
  requires_approval: boolean;
  status: string;
  proposed_action?: Record<string, unknown>;
  justification?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  organizationId: string;
  userId: string | null;
  role: MessageRole;
  content: string;
  citations: ChatCitation[];
  toolCalls: ChatToolActivity[];
  actionProposals: ChatActionProposal[];
  telemetry: Record<string, unknown>;
  status: MessageStatus;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  threadId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string | null;
  messageCount?: number;
}
