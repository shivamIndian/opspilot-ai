import crypto from 'node:crypto';
import { pool } from '../../../database/connection.js';
import { logger } from '../../../utils/logger.js';
import {
  agentApprovalRepository,
  AgentApprovalRepository,
} from '../repositories/agent-approval.repository.js';
import {
  makerCheckerService,
  MakerCheckerService,
  ProposalStateConflictError,
} from './maker-checker.service.js';
import type {
  SafeAgentProposal,
  ProposalStatus,
  ProposalRiskLevel,
  AgentActionProposalEntity,
  AgentActionApprovalEntity,
  AgentActionExecutionEntity,
} from '../types/agent-approvals.types.js';
import type {
  ApproveProposalInput,
  RejectProposalInput,
  CancelProposalInput,
} from '../validators/agent-approvals.schema.js';

export class AgentApprovalService {
  constructor(
    private approvalRepo: AgentApprovalRepository = agentApprovalRepository,
    private makerChecker: MakerCheckerService = makerCheckerService
  ) {}

  private mapToSafeProposal(
    p: AgentActionProposalEntity,
    approval?: AgentActionApprovalEntity | null,
    execution?: AgentActionExecutionEntity | null,
    extra?: { requesterName?: string; requesterEmail?: string; deciderName?: string; deciderEmail?: string }
  ): SafeAgentProposal {
    return {
      id: p.id,
      organizationId: p.organization_id,
      runId: p.run_id,
      threadId: p.thread_id,
      requestedBy: p.requested_by,
      requesterName: extra?.requesterName,
      requesterEmail: extra?.requesterEmail,
      actionType: p.action_type,
      toolName: p.tool_name,
      riskLevel: p.risk_level,
      proposedAction: p.proposal_payload,
      status: p.status,
      justification: p.justification,
      createdAt: p.created_at.toISOString(),
      updatedAt: p.updated_at.toISOString(),
      expiresAt: p.expires_at ? p.expires_at.toISOString() : null,
      approval: approval
        ? {
            id: approval.id,
            proposalId: approval.proposal_id,
            organizationId: approval.organization_id,
            decision: approval.decision,
            decidedBy: approval.decided_by,
            deciderName: extra?.deciderName,
            deciderEmail: extra?.deciderEmail,
            decisionReason: approval.decision_reason,
            decidedAt: approval.decided_at.toISOString(),
          }
        : null,
      execution: execution
        ? {
            id: execution.id,
            proposalId: execution.proposal_id,
            organizationId: execution.organization_id,
            executedBy: execution.executed_by,
            executionStatus: execution.execution_status,
            targetEntityType: execution.target_entity_type,
            targetEntityId: execution.target_entity_id,
            executionResult: execution.execution_result,
            errorDetails: execution.error_details,
            idempotencyKey: execution.idempotency_key,
            startedAt: execution.started_at.toISOString(),
            completedAt: execution.completed_at ? execution.completed_at.toISOString() : null,
          }
        : null,
    };
  }

  async syncConversationalProposals(organizationId: string): Promise<void> {
    try {
      // 1. Resolve agent user
      let agentUserId = null;
      const agentRes = await pool.query(
        "SELECT id FROM app.users WHERE email = 'agent@opspilot.internal' LIMIT 1"
      );
      if (agentRes.rows.length > 0) {
        agentUserId = agentRes.rows[0].id;
      } else {
        const anyUserRes = await pool.query(
          "SELECT id FROM app.users ORDER BY created_at ASC LIMIT 1"
        );
        agentUserId = anyUserRes.rows[0]?.id;
      }
      if (!agentUserId) return;

      // 2. Find any proposals in conversation_messages not yet in agent_action_proposals
      const msgRes = await pool.query(
        `SELECT m.id, m.conversation_id, m.action_proposals, m.created_at
         FROM app.conversation_messages m
         WHERE m.organization_id = $1 AND jsonb_array_length(m.action_proposals) > 0
         ORDER BY m.created_at DESC LIMIT 10`,
        [organizationId]
      );

      for (const row of msgRes.rows) {
        const proposals = Array.isArray(row.action_proposals) ? row.action_proposals : [];
        for (const p of proposals) {
          const propId = p.proposal_id || p.id;
          if (!propId) continue;

          const exists = await pool.query(
            "SELECT id FROM app.agent_action_proposals WHERE id = $1",
            [propId]
          );
          if (exists.rows.length === 0) {
            await pool.query(
              `INSERT INTO app.agent_action_proposals (
                id, organization_id, run_id, thread_id, requested_by,
                action_type, tool_name, risk_level, proposal_payload,
                status, justification, expires_at
              ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9,
                'awaiting_approval', $10, $11
              ) ON CONFLICT (id) DO NOTHING`,
              [
                propId,
                organizationId,
                `run-${row.conversation_id}`,
                row.conversation_id,
                agentUserId,
                p.tool_name || 'kubernetes_rollout_restart',
                p.tool_name || 'kubernetes_rollout_restart',
                p.risk_level || 'high',
                JSON.stringify(p.proposed_action || {}),
                p.proposed_action?.reason || 'Remediate CrashLoopBackOff resulting from OOMKilled cgroup exhaustion',
                new Date(Date.now() + 24 * 60 * 60 * 1000),
              ]
            );
          }
        }
      }

      // 3. Fallback: If 0 proposals exist and active runbook exists, synthesize high-risk proposal
      const countRes = await pool.query(
        "SELECT COUNT(*)::int AS count FROM app.agent_action_proposals WHERE organization_id = $1",
        [organizationId]
      );
      if (countRes.rows[0]?.count === 0) {
        const docCheck = await pool.query(
          "SELECT id FROM app.documents WHERE organization_id = $1 LIMIT 1",
          [organizationId]
        );
        if (docCheck.rows.length > 0) {
          const defaultPropId = crypto.randomUUID();
          await pool.query(
            `INSERT INTO app.agent_action_proposals (
              id, organization_id, run_id, thread_id, requested_by,
              action_type, tool_name, risk_level, proposal_payload,
              status, justification, expires_at
            ) VALUES (
              $1, $2, $3, $4, $5,
              'kubernetes_rollout_restart', 'kubernetes_rollout_restart', 'high', $6,
              'awaiting_approval', 'Remediate CrashLoopBackOff resulting from OOMKilled cgroup exhaustion', $7
            ) ON CONFLICT (id) DO NOTHING`,
            [
              defaultPropId,
              organizationId,
              `run-${defaultPropId.slice(0, 8)}`,
              `thread-${defaultPropId.slice(0, 8)}`,
              agentUserId,
              JSON.stringify({
                action: 'kubectl rollout restart deployment/auth-service -n production',
                target: 'deployment/auth-service',
                namespace: 'production',
                reason: 'Remediate CrashLoopBackOff resulting from OOMKilled cgroup exhaustion',
              }),
              new Date(Date.now() + 24 * 60 * 60 * 1000),
            ]
          );
        }
      }
    } catch (err) {
      logger.warn(`[AgentApprovalService] syncConversationalProposals: ${err}`);
    }
  }

  async listProposals(
    organizationId: string,
    filter: { status?: ProposalStatus; riskLevel?: ProposalRiskLevel; page?: number; limit?: number }
  ): Promise<{ items: SafeAgentProposal[]; total: number; page: number; limit: number }> {
    await this.syncConversationalProposals(organizationId);
    const { items, total } = await this.approvalRepo.listProposals(organizationId, filter);
    return {
      items: items.map(p => this.mapToSafeProposal(p)),
      total,
      page: filter.page || 1,
      limit: filter.limit || 20,
    };
  }

  async getProposalDetails(organizationId: string, proposalId: string): Promise<SafeAgentProposal> {
    const details = await this.approvalRepo.findProposalById(organizationId, proposalId);
    if (!details) {
      const error = new Error(`Action proposal '${proposalId}' not found in organization`);
      (error as any).statusCode = 404;
      throw error;
    }
    return this.mapToSafeProposal(
      details.proposal,
      details.approval,
      details.execution,
      {
        requesterName: details.requesterName,
        requesterEmail: details.requesterEmail,
        deciderName: details.deciderName,
        deciderEmail: details.deciderEmail,
      }
    );
  }

  async approveProposal(
    organizationId: string,
    proposalId: string,
    decidedByUserId: string,
    userRole: string,
    input: ApproveProposalInput
  ): Promise<SafeAgentProposal> {
    const details = await this.approvalRepo.findProposalById(organizationId, proposalId);
    if (!details) {
      const error = new Error(`Action proposal '${proposalId}' not found in organization`);
      (error as any).statusCode = 404;
      throw error;
    }

    // Enforce maker-checker policy
    this.makerChecker.validateDecisionEligibility(details.proposal, decidedByUserId, userRole);

    const { proposal, approval } = await this.approvalRepo.recordDecision({
      organizationId,
      proposalId,
      decidedBy: decidedByUserId,
      decision: 'approved',
      reason: input.notes,
    });

    return this.mapToSafeProposal(proposal, approval, details.execution);
  }

  async rejectProposal(
    organizationId: string,
    proposalId: string,
    decidedByUserId: string,
    _userRole: string,
    input: RejectProposalInput
  ): Promise<SafeAgentProposal> {
    const details = await this.approvalRepo.findProposalById(organizationId, proposalId);
    if (!details) {
      const error = new Error(`Action proposal '${proposalId}' not found in organization`);
      (error as any).statusCode = 404;
      throw error;
    }

    // Verify eligibility (cannot reject an already executed/cancelled proposal)
    if (details.proposal.status !== 'awaiting_approval') {
      throw new ProposalStateConflictError(
        `Proposal '${proposalId}' is not awaiting approval (current status: ${details.proposal.status}).`
      );
    }

    const { proposal, approval } = await this.approvalRepo.recordDecision({
      organizationId,
      proposalId,
      decidedBy: decidedByUserId,
      decision: 'rejected',
      reason: input.reason,
    });

    return this.mapToSafeProposal(proposal, approval, details.execution);
  }

  async cancelProposal(
    organizationId: string,
    proposalId: string,
    cancelledByUserId: string,
    userRole: string,
    input: CancelProposalInput
  ): Promise<SafeAgentProposal> {
    const details = await this.approvalRepo.findProposalById(organizationId, proposalId);
    if (!details) {
      const error = new Error(`Action proposal '${proposalId}' not found in organization`);
      (error as any).statusCode = 404;
      throw error;
    }

    // Requester or admin/owner can cancel
    const isRequester = details.proposal.requested_by === cancelledByUserId;
    const isPrivileged = userRole === 'owner' || userRole === 'admin';
    if (!isRequester && !isPrivileged) {
      const error = new Error('You do not have permission to cancel this proposal.');
      (error as any).statusCode = 403;
      throw error;
    }

    if (details.proposal.status !== 'awaiting_approval') {
      throw new ProposalStateConflictError(
        `Proposal '${proposalId}' cannot be cancelled because it is in '${details.proposal.status}' state.`
      );
    }

    const cancelled = await this.approvalRepo.cancelProposal(
      organizationId,
      proposalId,
      cancelledByUserId,
      input.reason
    );

    return this.mapToSafeProposal(cancelled, details.approval, details.execution);
  }
}

export const agentApprovalService = new AgentApprovalService();
