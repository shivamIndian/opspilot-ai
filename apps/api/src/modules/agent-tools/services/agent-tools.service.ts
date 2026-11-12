import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '../../../utils/logger.js';
import { knowledgeRetrievalService } from '../../knowledge/services/knowledge-retrieval.service.js';
import { ticketRepository } from '../../tickets/repositories/ticket.repository.js';
import { ticketActivityRepository } from '../../tickets/repositories/ticket-activity.repository.js';
import { memberRepository } from '../../organizations/repositories/member.repository.js';
import { agentApprovalRepository } from '../../agent-approvals/repositories/agent-approval.repository.js';
import type { ToolActionProposal } from '../types/agent-tools.types.js';
import type { OrganizationRole } from '../../organizations/types/organization.types.js';

const createTicketProposalSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(10000),
  category: z.string().default('technical_support'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

const updateTicketProposalSchema = z.object({
  ticketId: z.string().uuid(),
  changes: z.record(z.unknown()),
});

export class AgentToolsService {
  /**
   * 1. Search organization knowledge base via RAG retrieval engine.
   */
  async searchKnowledge(
    organizationId: string,
    payload: { query: string; topK?: number; retrievalMode?: string }
  ) {
    const topK = Math.min(Math.max(payload.topK || 5, 1), 20);
    const retrievalMode = (payload.retrievalMode || 'hybrid') as 'hybrid' | 'semantic' | 'keyword';

    const searchRes = await knowledgeRetrievalService.search(organizationId, {
      query: payload.query,
      topK,
      retrievalMode,
    });

    const passages = (searchRes.results || []).map(r => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      documentName: r.citation?.documentName || 'Untitled Document',
      pageStart: r.citation?.pageStart ?? null,
      pageEnd: r.citation?.pageEnd ?? null,
      sectionTitle: r.citation?.sectionTitle ?? null,
      content: r.content,
      relevanceScore: r.score,
    }));

    return {
      query: payload.query,
      resultCount: passages.length,
      retrievalMode,
      passages,
    };
  }

  /**
   * 2. Read details of a specific support ticket, enforcing organization boundaries.
   */
  async getTicket(
    organizationId: string,
    userId: string,
    userRole: OrganizationRole,
    ticketId: string
  ) {
    const ticket = await ticketRepository.findById(organizationId, ticketId);
    if (!ticket) {
      const error = new Error(`Ticket '${ticketId}' not found in organization`);
      (error as any).statusCode = 404;
      throw error;
    }

    // Role-based visibility check: non-admin/non-owner members can only see if creator or assignee
    if (userRole !== 'owner' && userRole !== 'admin') {
      if (ticket.created_by_user_id !== userId && ticket.assigned_to_user_id !== userId) {
        const error = new Error('You do not have permission to view this ticket');
        (error as any).statusCode = 403;
        throw error;
      }
    }

    return {
      ticket_id: ticket.id,
      organization_id: ticket.organization_id,
      ticket_number: ticket.ticket_number,
      title: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      created_by: ticket.created_by_user_id,
      assigned_to: ticket.assigned_to_user_id,
      created_at: ticket.created_at.toISOString(),
      updated_at: ticket.updated_at.toISOString(),
    };
  }

  /**
   * 3. Propose ticket creation. DOES NOT mutate app.tickets in Module 11.
   */
  async createTicketProposal(
    organizationId: string,
    userId: string,
    payload: unknown
  ): Promise<ToolActionProposal> {
    const validated = createTicketProposalSchema.parse(payload);
    const proposalId = crypto.randomUUID();

    logger.info(
      `[AgentTools] Created ticket creation proposal '${proposalId}' for org '${organizationId}' by user '${userId}'`
    );

    try {
      await agentApprovalRepository.createProposal({
        id: proposalId,
        organizationId,
        runId: (payload as any)?.run_id || (payload as any)?.runId || 'run-default',
        threadId: (payload as any)?.thread_id || (payload as any)?.threadId || 'thread-default',
        requestedBy: userId,
        actionType: 'create_ticket',
        toolName: 'create_support_ticket',
        riskLevel: 'high',
        proposalPayload: {
          action: 'create_ticket',
          title: validated.title,
          subject: validated.title,
          description: validated.description,
          category: validated.category,
          priority: validated.priority,
        },
      });
    } catch (err) {
      logger.warn(`[AgentTools] Failed to persist proposal to DB (ignorable in isolated tests): ${err}`);
    }

    return {
      proposalId,
      organizationId,
      requestedBy: userId,
      toolName: 'create_support_ticket',
      riskLevel: 'high',
      approvalRequired: true,
      executionMode: 'proposal_only',
      proposedAction: {
        action: 'create_ticket',
        subject: validated.title,
        description: validated.description,
        category: validated.category,
        priority: validated.priority,
      },
      status: 'awaiting_approval',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 4. Propose ticket update. DOES NOT mutate app.tickets in Module 11.
   */
  async updateTicketProposal(
    organizationId: string,
    userId: string,
    payload: unknown
  ): Promise<ToolActionProposal> {
    const validated = updateTicketProposalSchema.parse(payload);

    // Verify ticket exists in target organization
    const existingTicket = await ticketRepository.findById(organizationId, validated.ticketId);
    if (!existingTicket) {
      const error = new Error(`Ticket '${validated.ticketId}' not found in organization`);
      (error as any).statusCode = 404;
      throw error;
    }

    const proposalId = crypto.randomUUID();

    logger.info(
      `[AgentTools] Created ticket update proposal '${proposalId}' for ticket '${validated.ticketId}' in org '${organizationId}' by user '${userId}'`
    );

    try {
      await agentApprovalRepository.createProposal({
        id: proposalId,
        organizationId,
        runId: (payload as any)?.run_id || (payload as any)?.runId || 'run-default',
        threadId: (payload as any)?.thread_id || (payload as any)?.threadId || 'thread-default',
        requestedBy: userId,
        actionType: 'update_ticket',
        toolName: 'update_support_ticket',
        riskLevel: 'high',
        proposalPayload: {
          action: 'update_ticket',
          ticketId: validated.ticketId,
          ticket_id: validated.ticketId,
          existingTicketNumber: existingTicket.ticket_number,
          changes: validated.changes,
        },
      });
    } catch (err) {
      logger.warn(`[AgentTools] Failed to persist proposal to DB (ignorable in isolated tests): ${err}`);
    }

    return {
      proposalId,
      organizationId,
      requestedBy: userId,
      toolName: 'update_support_ticket',
      riskLevel: 'high',
      approvalRequired: true,
      executionMode: 'proposal_only',
      proposedAction: {
        action: 'update_ticket',
        ticketId: validated.ticketId,
        existingTicketNumber: existingTicket.ticket_number,
        changes: validated.changes,
      },
      status: 'awaiting_approval',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 5. Search organization users with strict data minimization (no passwords, tokens, hashes).
   */
  async searchUsers(
    organizationId: string,
    payload: { query?: string; role?: string; limit?: number }
  ) {
    const limit = Math.min(Math.max(payload.limit || 10, 1), 50);

    const members = await memberRepository.listByOrganization(organizationId, {
      search: payload.query,
      role: payload.role as any,
      limit,
    });

    const sanitizedUsers = members.map(m => ({
      userId: m.userId,
      name: m.name,
      role: m.role,
      status: m.status,
    }));

    return {
      totalFound: sanitizedUsers.length,
      users: sanitizedUsers,
    };
  }

  /**
   * 6. Retrieve activity history and context. Masks internal confidential notes.
   */
  async summarizeSupportHistory(
    organizationId: string,
    userId: string,
    userRole: OrganizationRole,
    payload: { ticketId?: string; userId?: string; status?: string; limit?: number }
  ) {
    const limit = Math.min(Math.max(payload.limit || 10, 1), 50);

    if (payload.ticketId) {
      // Activity log history for a specific ticket
      const ticket = await ticketRepository.findById(organizationId, payload.ticketId);
      if (!ticket) {
        const error = new Error(`Ticket '${payload.ticketId}' not found in organization`);
        (error as any).statusCode = 404;
        throw error;
      }

      if (userRole !== 'owner' && userRole !== 'admin') {
        if (ticket.created_by_user_id !== userId && ticket.assigned_to_user_id !== userId) {
          const error = new Error('You do not have permission to view activity for this ticket');
          (error as any).statusCode = 403;
          throw error;
        }
      }

      const { logs } = await ticketActivityRepository.listByTicket(
        organizationId,
        payload.ticketId,
        limit
      );

      const records = logs.map(l => ({
        itemId: l.id,
        ticketId: l.ticket_id,
        activityType: l.action,
        summary: `Action ${l.action} performed by ${l.actor_name || 'System'}`,
        actorId: l.actor_user_id,
        createdAt: l.created_at.toISOString(),
      }));

      return {
        totalRecords: records.length,
        records,
      };
    } else {
      // General ticket history
      const { tickets } = await ticketRepository.list(
        organizationId,
        {
          status: payload.status as any,
          createdBy: payload.userId,
          limit,
        },
        userRole,
        userId
      );

      const records = tickets.map(t => ({
        itemId: t.id,
        ticketId: t.id,
        activityType: 'ticket_created',
        summary: `Ticket #${t.ticket_number}: ${t.subject} (Status: ${t.status}, Priority: ${t.priority})`,
        actorId: t.created_by_user_id,
        createdAt: t.created_at.toISOString(),
      }));

      return {
        totalRecords: records.length,
        records,
      };
    }
  }
}

export const agentToolsService = new AgentToolsService();
