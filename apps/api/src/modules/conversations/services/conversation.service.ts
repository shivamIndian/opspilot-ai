import crypto from 'node:crypto';
import type { Response } from 'express';
import { conversationRepository, ConversationRepository } from '../repositories/conversation.repository.js';
import { workflowService, WorkflowService } from '../../agent-workflows/services/workflow.service.js';
import type {
  SafeConversation,
  SafeConversationMessage,
  CreateConversationInput,
  SendMessageInput,
  ToolActivityItem,
} from '../types/conversation.types.js';

export class ConversationServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public errorCode: string = 'CONVERSATION_ERROR'
  ) {
    super(message);
    this.name = 'ConversationServiceError';
  }
}

export class ConversationService {
  constructor(
    private repo: ConversationRepository = conversationRepository,
    private workflow: WorkflowService = workflowService
  ) {}

  async createConversation(
    organizationId: string,
    userId: string,
    userRole: string,
    input: CreateConversationInput
  ): Promise<{
    conversation: SafeConversation;
    initialMessages?: { userMessage: SafeConversationMessage; assistantMessage: SafeConversationMessage };
  }> {
    const threadId = crypto.randomUUID();
    let title = input.title?.trim();

    if (!title && input.initialMessage) {
      const trimmed = input.initialMessage.trim();
      title = trimmed.length > 35 ? `${trimmed.slice(0, 35)}...` : trimmed;
    }

    const entity = await this.repo.createConversation({
      organizationId,
      userId,
      title: title || 'New Conversation',
      threadId,
    });

    const safeConv = this.repo.toSafeConversation(entity);

    if (input.initialMessage && input.initialMessage.trim().length > 0) {
      const messages = await this.sendMessage(
        organizationId,
        userId,
        userRole,
        safeConv.id,
        { content: input.initialMessage.trim() }
      );
      return { conversation: safeConv, initialMessages: messages };
    }

    return { conversation: safeConv };
  }

  async listConversations(
    organizationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SafeConversation[]> {
    const entities = await this.repo.listConversations(organizationId, userId, limit, offset);
    return entities.map((e) => this.repo.toSafeConversation(e));
  }

  async getConversation(
    organizationId: string,
    userId: string,
    conversationId: string
  ): Promise<SafeConversation> {
    const entity = await this.repo.getConversationById(organizationId, userId, conversationId);
    if (!entity) {
      throw new ConversationServiceError(
        'Conversation not found or access denied',
        404,
        'CONVERSATION_NOT_FOUND'
      );
    }
    return this.repo.toSafeConversation(entity);
  }

  async updateTitle(
    organizationId: string,
    userId: string,
    conversationId: string,
    title: string
  ): Promise<SafeConversation> {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      throw new ConversationServiceError('Conversation title cannot be empty', 400, 'INVALID_TITLE');
    }

    const updated = await this.repo.updateTitle(organizationId, userId, conversationId, cleanTitle);
    if (!updated) {
      throw new ConversationServiceError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    return this.repo.toSafeConversation(updated);
  }

  async archiveConversation(
    organizationId: string,
    userId: string,
    conversationId: string
  ): Promise<void> {
    const success = await this.repo.archiveConversation(organizationId, userId, conversationId);
    if (!success) {
      throw new ConversationServiceError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }
  }

  async listMessages(
    organizationId: string,
    userId: string,
    conversationId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<SafeConversationMessage[]> {
    // Verify conversation tenancy
    await this.getConversation(organizationId, userId, conversationId);

    const messages = await this.repo.listMessages(organizationId, conversationId, limit, offset);
    return messages.map((m) => this.repo.toSafeMessage(m));
  }

  async sendMessage(
    organizationId: string,
    userId: string,
    userRole: string,
    conversationId: string,
    input: SendMessageInput
  ): Promise<{
    userMessage: SafeConversationMessage;
    assistantMessage: SafeConversationMessage;
  }> {
    const content = input.content?.trim();
    if (!content) {
      throw new ConversationServiceError('Message content cannot be empty', 400, 'INVALID_MESSAGE');
    }
    if (content.length > 5000) {
      throw new ConversationServiceError('Message length exceeds maximum limit of 5,000 characters', 400, 'MESSAGE_TOO_LONG');
    }

    // 1. Verify conversation belongs to user & organization
    const conversation = await this.getConversation(organizationId, userId, conversationId);

    // 2. Persist user message
    const userMsgEntity = await this.repo.createMessage({
      conversationId: conversation.id,
      organizationId,
      userId,
      role: 'user',
      content,
      status: 'completed',
    });

    // 3. Auto-title conversation if default
    if (conversation.title === 'New Conversation') {
      const generatedTitle = content.length > 35 ? `${content.slice(0, 35)}...` : content;
      await this.repo.updateTitle(organizationId, userId, conversation.id, generatedTitle);
    }

    // 4. Delegate to existing LangGraph Workflow Engine
    let assistantAnswer = '';
    let citations: any[] = [];
    let actionProposals: any[] = [];
    let toolCalls: ToolActivityItem[] = [];
    let telemetry: Record<string, unknown> = {};
    let messageStatus: any = 'completed';

    try {
      const workflowResult = await this.workflow.runWorkflow({
        organizationId,
        userId,
        userRole,
        query: content,
        threadId: conversation.threadId,
        workflowVersion: input.workflowVersion || 'v1.0',
        correlationId: input.correlationId,
      });

      assistantAnswer = workflowResult.answer || 'I have completed your request.';
      citations = workflowResult.citations || [];
      telemetry = {
        runId: workflowResult.run_id,
        threadId: workflowResult.thread_id,
        durationMs: workflowResult.duration_ms,
        intent: workflowResult.intent,
        totalSteps: (workflowResult as any).total_steps ?? 0,
        toolCallCount: (workflowResult as any).tool_call_count ?? 0,
      };

      if (workflowResult.selected_tool) {
        toolCalls.push({
          toolName: workflowResult.selected_tool,
          status: 'completed',
          summary: `Executed ${workflowResult.selected_tool}`,
          timestamp: new Date().toISOString(),
        });
      }

      if (workflowResult.requires_approval && workflowResult.proposal) {
        actionProposals.push(workflowResult.proposal);
        messageStatus = 'waiting_approval';
      } else if (workflowResult.status === 'failed') {
        messageStatus = 'failed';
      }
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Workflow execution encountered an error';
      assistantAnswer = `I encountered an unexpected issue while processing your request: ${errMessage}. Please try again.`;
      messageStatus = 'failed';
      telemetry = { error: errMessage };
    }

    // 5. Persist assistant response
    const assistantMsgEntity = await this.repo.createMessage({
      conversationId: conversation.id,
      organizationId,
      userId: null,
      role: 'assistant',
      content: assistantAnswer,
      citations,
      toolCalls,
      actionProposals,
      telemetry,
      status: messageStatus,
    });

    return {
      userMessage: this.repo.toSafeMessage(userMsgEntity),
      assistantMessage: this.repo.toSafeMessage(assistantMsgEntity),
    };
  }

  async streamMessage(
    organizationId: string,
    userId: string,
    userRole: string,
    conversationId: string,
    input: SendMessageInput,
    res: Response
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      sendEvent('status', { status: 'analyzing', message: 'Analyzing operational inquiry...' });

      const result = await this.sendMessage(
        organizationId,
        userId,
        userRole,
        conversationId,
        input
      );

      sendEvent('user_message', result.userMessage);

      if (result.assistantMessage.toolCalls.length > 0) {
        sendEvent('tool_activity', result.assistantMessage.toolCalls);
      }

      if (result.assistantMessage.citations.length > 0) {
        sendEvent('citations', result.assistantMessage.citations);
      }

      if (result.assistantMessage.actionProposals.length > 0) {
        sendEvent('approval_required', result.assistantMessage.actionProposals);
      }

      // Stream words or lines progressively
      const words = result.assistantMessage.content.split(' ');
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
        sendEvent('delta', { delta: chunk });
      }

      sendEvent('completed', result.assistantMessage);
      res.write('event: done\ndata: [DONE]\n\n');
      res.end();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Stream failed';
      sendEvent('error', { message: msg });
      res.end();
    }
  }
}

export const conversationService = new ConversationService();
