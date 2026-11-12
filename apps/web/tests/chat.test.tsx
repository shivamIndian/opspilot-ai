import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatPage } from '@/features/chat/pages/ChatPage';
import { chatService } from '@/features/chat/services/chat.service';
import type { ChatConversation, ChatMessage } from '@/features/chat/types/chat.types';

const mockConversations: ChatConversation[] = [
  {
    id: 'conv-1',
    organizationId: 'org-1',
    userId: 'user-1',
    threadId: 'thread-1',
    title: 'Deploy rollback assistance',
    status: 'active',
    metadata: {},
    messageCount: 2,
    createdAt: '2026-11-04T10:00:00.000Z',
    updatedAt: '2026-11-04T10:05:00.000Z',
  },
  {
    id: 'conv-2',
    organizationId: 'org-1',
    userId: 'user-1',
    threadId: 'thread-2',
    title: 'Database indexing tips',
    status: 'active',
    metadata: {},
    messageCount: 0,
    createdAt: '2026-11-04T09:00:00.000Z',
    updatedAt: '2026-11-04T09:00:00.000Z',
  },
];

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    organizationId: 'org-1',
    userId: 'user-1',
    role: 'user',
    content: 'How do I perform an emergency rollback for service api-gateway?',
    citations: [],
    toolCalls: [],
    actionProposals: [],
    telemetry: {},
    status: 'completed',
    createdAt: '2026-11-04T10:00:00.000Z',
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    organizationId: 'org-1',
    userId: null,
    role: 'assistant',
    content: 'According to runbook **RB-042**, you can trigger an automated rollback using the release manager CLI or approve the proposed action below.',
    citations: [
      {
        chunk_id: 'chk-1',
        document_id: 'doc-42',
        filename: 'Emergency Deployment Runbook.pdf',
        snippet: 'To rollback api-gateway execute rollback-deployment with revision tag',
        score: 0.94,
      },
    ],
    toolCalls: [
      {
        toolName: 'knowledge_search',
        status: 'completed',
        summary: 'Searched runbooks for rollback commands',
      },
    ],
    actionProposals: [
      {
        proposal_id: 'act-99',
        tool_name: 'rollback_deployment',
        risk_level: 'high',
        requires_approval: true,
        status: 'pending',
        justification: 'Initiate immediate rollback of api-gateway to v2.4.1',
      },
    ],
    telemetry: {
      executionTimeMs: 820,
      toolsUsedCount: 1,
    },
    status: 'completed',
    createdAt: '2026-11-04T10:01:00.000Z',
  },
];

describe('Module 19 — AI Chat Interface', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(chatService, 'listConversations').mockResolvedValue(mockConversations);
    vi.spyOn(chatService, 'listMessages').mockImplementation(async (_orgId, convId) => {
      if (convId === 'conv-1') return mockMessages;
      return [];
    });
    vi.spyOn(chatService, 'createConversation').mockResolvedValue({
      conversation: {
        id: 'conv-3',
        organizationId: 'org-1',
        userId: 'user-1',
        threadId: 'thread-3',
        title: 'New Conversation',
        status: 'active',
        metadata: {},
        messageCount: 0,
        createdAt: '2026-11-04T10:10:00.000Z',
        updatedAt: '2026-11-04T10:10:00.000Z',
      },
    });
    vi.spyOn(chatService, 'sendMessage').mockResolvedValue({
      userMessage: {
        id: 'msg-3',
        conversationId: 'conv-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'user',
        content: 'Check status of pods',
        citations: [],
        toolCalls: [],
        actionProposals: [],
        telemetry: {},
        status: 'completed',
        createdAt: '2026-11-04T10:02:00.000Z',
      },
      assistantMessage: {
        id: 'msg-4',
        conversationId: 'conv-1',
        organizationId: 'org-1',
        userId: null,
        role: 'assistant',
        content: 'All pods in production cluster are healthy.',
        citations: [],
        toolCalls: [],
        actionProposals: [],
        telemetry: {},
        status: 'completed',
        createdAt: '2026-11-04T10:02:05.000Z',
      },
    });
    vi.spyOn(chatService, 'renameConversation').mockResolvedValue({
      ...mockConversations[0],
      title: 'Updated Conversation Title',
    });
    vi.spyOn(chatService, 'archiveConversation').mockResolvedValue();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/organizations/org-1/chat']}>
          <Routes>
            <Route path="/organizations/:organizationId/chat" element={<ChatPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders chat interface with conversations sidebar and message history', async () => {
    renderComponent();

    // Verify conversation list items are loaded
    await waitFor(() => {
      expect(screen.getByText('Deploy rollback assistance')).toBeInTheDocument();
      expect(screen.getByText('Database indexing tips')).toBeInTheDocument();
    });

    // Verify messages for active conversation conv-1 are rendered
    await waitFor(() => {
      expect(
        screen.getByText('How do I perform an emergency rollback for service api-gateway?')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/According to runbook/i)
      ).toBeInTheDocument();
    });

    // Verify citations card is rendered
    expect(screen.getByText(/Emergency Deployment Runbook/i)).toBeInTheDocument();

    // Verify action proposal / approval card is rendered
    expect(screen.getByText(/Human Approval Required/i)).toBeInTheDocument();
    expect(screen.getByText(/Initiate immediate rollback of api-gateway to v2.4.1/i)).toBeInTheDocument();
  });

  it('switches to empty conversation and shows prompt suggestions empty state', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Database indexing tips')).toBeInTheDocument();
    });

    // Switch to conv-2 (empty)
    fireEvent.click(screen.getByText('Database indexing tips'));

    await waitFor(() => {
      expect(screen.getByText('Welcome to OpsPilot Enterprise Assistant')).toBeInTheDocument();
      expect(
        screen.getByText(/How do I configure employee VPN and SSO access/i)
      ).toBeInTheDocument();
    });
  });

  it('sends a user message and triggers chatService.sendMessage', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Deploy rollback assistance')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ask OpsPilot AI anything/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Ask OpsPilot AI anything/i);
    fireEvent.change(textarea, { target: { value: 'Check status of pods' } });

    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(chatService.sendMessage).toHaveBeenCalledWith('org-1', 'conv-1', 'Check status of pods');
    });
  });

  it('creates a new conversation when New Conversation button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('New Conversation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Conversation'));

    await waitFor(() => {
      expect(chatService.createConversation).toHaveBeenCalledWith('org-1', 'New Conversation', undefined);
    });
  });
});
