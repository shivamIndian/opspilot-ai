import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { tokenService } from '../src/modules/auth/services/token.service.js';
import { organizationRepository } from '../src/modules/organizations/repositories/organization.repository.js';
import { memberRepository } from '../src/modules/organizations/repositories/member.repository.js';
import { conversationRepository } from '../src/modules/conversations/repositories/conversation.repository.js';
import { workflowService } from '../src/modules/agent-workflows/services/workflow.service.js';
import type { UserEntity } from '../src/modules/auth/types/auth.types.js';
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from '../src/modules/organizations/types/organization.types.js';
import type {
  ConversationEntity,
  ConversationMessageEntity,
} from '../src/modules/conversations/types/conversation.types.js';

describe('OpsPilot API – AI Chat Conversations (Module 19)', () => {
  const orgId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const otherOrgId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const userId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const convId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  const user: UserEntity = {
    id: userId,
    name: 'Engineer Alice',
    email: 'alice@opspilot.test',
    password_hash: 'hash',
    platform_role: 'user',
    status: 'active',
    email_verified_at: new Date('2026-01-01T00:00:00Z'),
    password_changed_at: null,
    last_login_at: new Date(),
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const org: OrganizationEntity = {
    id: orgId,
    name: 'OpsPilot Chat Org',
    slug: 'opspilot-chat',
    description: 'Org for chat tests',
    logo_url: null,
    status: 'active',
    created_by_user_id: userId,
    created_at: new Date(),
    updated_at: new Date(),
    archived_at: null,
  };

  const member: OrganizationMemberEntity = {
    id: 'mem-1',
    organization_id: orgId,
    user_id: userId,
    role: 'member',
    status: 'active',
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockConv: ConversationEntity = {
    id: convId,
    organization_id: orgId,
    user_id: userId,
    title: 'New Conversation',
    thread_id: 'thread-test-101',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
    archived_at: null,
    last_message: 'Hello assistant',
    message_count: 2,
  };

  let token: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    token = tokenService.generateAccessToken(user.id, user.platform_role).token;

    vi.spyOn(organizationRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === orgId) return org;
      return null;
    });

    vi.spyOn(memberRepository, 'findByOrgAndUser').mockImplementation(
      async (oId: string, uId: string) => {
        if (oId === orgId && uId === userId) return member;
        return null;
      }
    );
  });

  describe('POST /api/v1/organizations/:organizationId/conversations', () => {
    it('creates a new conversation for authenticated member', async () => {
      vi.spyOn(conversationRepository, 'createConversation').mockResolvedValue(mockConv);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/conversations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Ticket Triage Help' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversation.id).toBe(convId);
      expect(res.body.data.conversation.threadId).toBe('thread-test-101');
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/conversations`)
        .send({ title: 'Unauthorized' });

      expect(res.status).toBe(401);
    });

    it('rejects requests if user is not member of target org with 404', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${otherOrgId}/conversations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Cross Org' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/organizations/:organizationId/conversations', () => {
    it('lists conversations scoped strictly to user and organization', async () => {
      vi.spyOn(conversationRepository, 'listConversations').mockResolvedValue([mockConv]);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/conversations`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(convId);
      expect(res.body.data[0].messageCount).toBe(2);
    });
  });

  describe('GET & PATCH /api/v1/organizations/:organizationId/conversations/:conversationId', () => {
    it('retrieves conversation details when user is the owner', async () => {
      vi.spyOn(conversationRepository, 'getConversationById').mockResolvedValue(mockConv);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/conversations/${convId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(convId);
    });

    it('returns 404 when conversation belongs to another user or does not exist', async () => {
      vi.spyOn(conversationRepository, 'getConversationById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/conversations/${convId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });

    it('renames conversation successfully', async () => {
      vi.spyOn(conversationRepository, 'updateTitle').mockResolvedValue({
        ...mockConv,
        title: 'VPN Connection Inquiries',
      });

      const res = await request(app)
        .patch(`/api/v1/organizations/${orgId}/conversations/${convId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'VPN Connection Inquiries' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('VPN Connection Inquiries');
    });

    it('rejects empty title update with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${orgId}/conversations/${convId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TITLE');
    });
  });

  describe('DELETE /api/v1/organizations/:organizationId/conversations/:conversationId', () => {
    it('archives conversation successfully', async () => {
      vi.spyOn(conversationRepository, 'archiveConversation').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/organizations/${orgId}/conversations/${convId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/organizations/:organizationId/conversations/:conversationId/messages', () => {
    it('submits user message, invokes LangGraph workflow, and persists response with citations', async () => {
      vi.spyOn(conversationRepository, 'getConversationById').mockResolvedValue(mockConv);
      vi.spyOn(conversationRepository, 'updateTitle').mockResolvedValue(mockConv);

      const mockUserMsg: ConversationMessageEntity = {
        id: 'msg-u-1',
        conversation_id: convId,
        organization_id: orgId,
        user_id: userId,
        role: 'user',
        content: 'How do I reset my SSO password?',
        citations: [],
        tool_calls: [],
        action_proposals: [],
        telemetry: {},
        status: 'completed',
        created_at: new Date(),
      };

      const mockAssistantMsg: ConversationMessageEntity = {
        id: 'msg-a-1',
        conversation_id: convId,
        organization_id: orgId,
        user_id: null,
        role: 'assistant',
        content: 'To reset your SSO password, visit identity.internal/reset.',
        citations: [
          {
            chunk_id: 'chk-1',
            document_id: 'doc-1',
            filename: 'sso-guide.pdf',
            score: 0.92,
            snippet: 'SSO password reset instructions...',
          },
        ],
        tool_calls: [
          {
            toolName: 'search_knowledge_base',
            status: 'completed',
            summary: 'Searched RAG index',
            timestamp: new Date().toISOString(),
          },
        ],
        action_proposals: [],
        telemetry: { runId: 'run-99', durationMs: 1100 },
        status: 'completed',
        created_at: new Date(),
      };

      vi.spyOn(conversationRepository, 'createMessage')
        .mockResolvedValueOnce(mockUserMsg)
        .mockResolvedValueOnce(mockAssistantMsg);

      vi.spyOn(workflowService, 'runWorkflow').mockResolvedValue({
        run_id: 'run-99',
        thread_id: 'thread-test-101',
        organization_id: orgId,
        status: 'completed',
        answer: 'To reset your SSO password, visit identity.internal/reset.',
        citations: mockAssistantMsg.citations,
        selected_tool: 'search_knowledge_base',
        insufficient_evidence: false,
        requires_approval: false,
        duration_ms: 1100,
      });

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'How do I reset my SSO password?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userMessage.content).toBe('How do I reset my SSO password?');
      expect(res.body.data.assistantMessage.content).toContain('identity.internal/reset');
      expect(res.body.data.assistantMessage.citations).toHaveLength(1);
      expect(res.body.data.assistantMessage.citations[0].filename).toBe('sso-guide.pdf');
    });

    it('rejects empty message with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MESSAGE');
    });

    it('rejects message exceeding 5000 characters with 400', async () => {
      const longContent = 'A'.repeat(5001);
      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: longContent });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MESSAGE_TOO_LONG');
    });
  });

  describe('GET /api/v1/organizations/:organizationId/conversations/:conversationId/messages', () => {
    it('returns conversation messages in chronological order', async () => {
      vi.spyOn(conversationRepository, 'getConversationById').mockResolvedValue(mockConv);
      vi.spyOn(conversationRepository, 'listMessages').mockResolvedValue([
        {
          id: 'msg-1',
          conversation_id: convId,
          organization_id: orgId,
          user_id: userId,
          role: 'user',
          content: 'Hello AI',
          citations: [],
          tool_calls: [],
          action_proposals: [],
          telemetry: {},
          status: 'completed',
          created_at: new Date('2026-11-04T10:00:00Z'),
        },
        {
          id: 'msg-2',
          conversation_id: convId,
          organization_id: orgId,
          user_id: null,
          role: 'assistant',
          content: 'Hello! How can I assist your operations today?',
          citations: [],
          tool_calls: [],
          action_proposals: [],
          telemetry: {},
          status: 'completed',
          created_at: new Date('2026-11-04T10:00:02Z'),
        },
      ]);

      const res = await request(app)
        .get(`/api/v1/organizations/${orgId}/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].role).toBe('user');
      expect(res.body.data[1].role).toBe('assistant');
    });
  });
});
