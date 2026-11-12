import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../database/connection.js';
import type {
  AgentActionProposalEntity,
  AgentActionApprovalEntity,
  AgentActionExecutionEntity,
  AgentWorkflowOutboxEntity,
  ApprovalDecision,
  ProposalRiskLevel,
  ProposalStatus,
  ExecutionStatus,
  OutboxEventStatus,
} from '../types/agent-approvals.types.js';

export interface CreateProposalParams {
  id?: string;
  organizationId: string;
  runId: string;
  threadId: string;
  requestedBy: string;
  actionType: string;
  toolName: string;
  riskLevel: ProposalRiskLevel;
  proposalPayload: Record<string, any>;
  justification?: string | null;
  policySnapshot?: Record<string, any> | null;
  expiresAt?: Date | null;
}

export class AgentApprovalRepository {
  constructor(private db: Pool = pool) {}

  async createProposal(params: CreateProposalParams, client?: PoolClient): Promise<AgentActionProposalEntity> {
    const dbClient = client || this.db;
    const query = `
      INSERT INTO app.agent_action_proposals (
        id, organization_id, run_id, thread_id, requested_by,
        action_type, tool_name, risk_level, proposal_payload,
        status, justification, policy_snapshot, expires_at
      ) VALUES (
        COALESCE($1, gen_random_uuid()), $2, $3, $4, $5,
        $6, $7, $8, $9,
        'awaiting_approval', $10, $11, $12
      )
      RETURNING *;
    `;
    const values = [
      params.id || null,
      params.organizationId,
      params.runId,
      params.threadId,
      params.requestedBy,
      params.actionType,
      params.toolName,
      params.riskLevel,
      JSON.stringify(params.proposalPayload),
      params.justification || null,
      params.policySnapshot ? JSON.stringify(params.policySnapshot) : null,
      params.expiresAt || null,
    ];

    const { rows } = await dbClient.query(query, values);
    return rows[0];
  }

  async findProposalById(
    organizationId: string,
    proposalId: string
  ): Promise<{
    proposal: AgentActionProposalEntity;
    approval: AgentActionApprovalEntity | null;
    execution: AgentActionExecutionEntity | null;
    requesterName?: string;
    requesterEmail?: string;
    deciderName?: string;
    deciderEmail?: string;
  } | null> {
    const query = `
      SELECT 
        p.*,
        u_req.name AS requester_name,
        u_req.email AS requester_email,
        a.id AS approval_id,
        a.decision AS approval_decision,
        a.decided_by AS approval_decided_by,
        a.decision_reason AS approval_decision_reason,
        a.decided_at AS approval_decided_at,
        u_dec.name AS decider_name,
        u_dec.email AS decider_email,
        e.id AS execution_id,
        e.executed_by AS execution_executed_by,
        e.execution_status AS execution_status,
        e.target_entity_type AS execution_target_entity_type,
        e.target_entity_id AS execution_target_entity_id,
        e.execution_result AS execution_result,
        e.error_details AS execution_error_details,
        e.idempotency_key AS execution_idempotency_key,
        e.started_at AS execution_started_at,
        e.completed_at AS execution_completed_at
      FROM app.agent_action_proposals p
      LEFT JOIN app.users u_req ON p.requested_by = u_req.id
      LEFT JOIN app.agent_action_approvals a ON p.id = a.proposal_id
      LEFT JOIN app.users u_dec ON a.decided_by = u_dec.id
      LEFT JOIN app.agent_action_executions e ON p.id = e.proposal_id
      WHERE p.id = $1 AND p.organization_id = $2;
    `;

    const { rows } = await this.db.query(query, [proposalId, organizationId]);
    if (rows.length === 0) return null;

    const row = rows[0];
    const proposal: AgentActionProposalEntity = {
      id: row.id,
      organization_id: row.organization_id,
      run_id: row.run_id,
      thread_id: row.thread_id,
      requested_by: row.requested_by,
      action_type: row.action_type,
      tool_name: row.tool_name,
      risk_level: row.risk_level,
      proposal_payload: row.proposal_payload,
      status: row.status,
      justification: row.justification,
      policy_snapshot: row.policy_snapshot,
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
    };

    const approval: AgentActionApprovalEntity | null = row.approval_id
      ? {
          id: row.approval_id,
          proposal_id: row.id,
          organization_id: row.organization_id,
          decision: row.approval_decision,
          decided_by: row.approval_decided_by,
          decision_reason: row.approval_decision_reason,
          decided_at: row.approval_decided_at,
        }
      : null;

    const execution: AgentActionExecutionEntity | null = row.execution_id
      ? {
          id: row.execution_id,
          proposal_id: row.id,
          organization_id: row.organization_id,
          executed_by: row.execution_executed_by,
          execution_status: row.execution_status,
          target_entity_type: row.execution_target_entity_type,
          target_entity_id: row.execution_target_entity_id,
          execution_result: row.execution_result,
          error_details: row.error_details,
          idempotency_key: row.execution_idempotency_key,
          started_at: row.execution_started_at,
          completed_at: row.execution_completed_at,
        }
      : null;

    return {
      proposal,
      approval,
      execution,
      requesterName: row.requester_name || undefined,
      requesterEmail: row.requester_email || undefined,
      deciderName: row.decider_name || undefined,
      deciderEmail: row.decider_email || undefined,
    };
  }

  async listProposals(
    organizationId: string,
    filter: { status?: ProposalStatus; riskLevel?: ProposalRiskLevel; page?: number; limit?: number }
  ): Promise<{ items: AgentActionProposalEntity[]; total: number }> {
    const conditions: string[] = ['p.organization_id = $1'];
    const values: any[] = [organizationId];
    let paramIndex = 2;

    if (filter.status) {
      conditions.push(`p.status = $${paramIndex}`);
      values.push(filter.status);
      paramIndex++;
    }

    if (filter.riskLevel) {
      conditions.push(`p.risk_level = $${paramIndex}`);
      values.push(filter.riskLevel);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 20;
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM app.agent_action_proposals p
      WHERE ${whereClause};
    `;
    const countRes = await this.db.query(countQuery, values);
    const total = countRes.rows[0]?.total || 0;

    const dataQuery = `
      SELECT p.*
      FROM app.agent_action_proposals p
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;
    values.push(limit, offset);
    const dataRes = await this.db.query(dataQuery, values);

    return {
      items: dataRes.rows,
      total,
    };
  }

  /**
   * Atomic decision recording (approve or reject) in a transaction.
   * Updates proposal status, records approval decision, and appends outbox event.
   */
  async recordDecision(params: {
    organizationId: string;
    proposalId: string;
    decidedBy: string;
    decision: ApprovalDecision;
    reason?: string | null;
  }): Promise<{ proposal: AgentActionProposalEntity; approval: AgentActionApprovalEntity; outboxId: string }> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const newStatus: ProposalStatus = params.decision === 'approved' ? 'approved' : 'rejected';

      // 1. Update proposal status
      const updateProposalQuery = `
        UPDATE app.agent_action_proposals
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND organization_id = $3 AND status = 'awaiting_approval'
        RETURNING *;
      `;
      const propRes = await client.query(updateProposalQuery, [newStatus, params.proposalId, params.organizationId]);
      if (propRes.rows.length === 0) {
        throw new Error('Proposal not found or is no longer in awaiting_approval state.');
      }
      const updatedProposal: AgentActionProposalEntity = propRes.rows[0];

      // 2. Insert approval decision
      const insertApprovalQuery = `
        INSERT INTO app.agent_action_approvals (
          proposal_id, organization_id, decision, decided_by, decision_reason
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const appRes = await client.query(insertApprovalQuery, [
        params.proposalId,
        params.organizationId,
        params.decision,
        params.decidedBy,
        params.reason || null,
      ]);
      const createdApproval: AgentActionApprovalEntity = appRes.rows[0];

      // 3. Insert outbox event for durable async processing & resumption
      const eventType = params.decision === 'approved' ? 'PROPOSAL_APPROVED' : 'PROPOSAL_REJECTED';
      const outboxPayload = {
        proposalId: params.proposalId,
        organizationId: params.organizationId,
        runId: updatedProposal.run_id,
        threadId: updatedProposal.thread_id,
        actionType: updatedProposal.action_type,
        toolName: updatedProposal.tool_name,
        decision: params.decision,
        decidedBy: params.decidedBy,
        decisionReason: params.reason || null,
        proposalPayload: updatedProposal.proposal_payload,
      };

      const insertOutboxQuery = `
        INSERT INTO app.agent_workflow_outbox (
          proposal_id, organization_id, event_type, payload, status
        ) VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id;
      `;
      const outboxRes = await client.query(insertOutboxQuery, [
        params.proposalId,
        params.organizationId,
        eventType,
        JSON.stringify(outboxPayload),
      ]);
      const outboxId = outboxRes.rows[0].id;

      await client.query('COMMIT');

      return {
        proposal: updatedProposal,
        approval: createdApproval,
        outboxId,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async cancelProposal(
    organizationId: string,
    proposalId: string,
    cancelledBy: string,
    reason?: string | null
  ): Promise<AgentActionProposalEntity> {
    const query = `
      UPDATE app.agent_action_proposals
      SET status = 'cancelled', justification = COALESCE($4, justification), updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND status = 'awaiting_approval'
      RETURNING *;
    `;
    const { rows } = await this.db.query(query, [proposalId, organizationId, cancelledBy, reason || null]);
    if (rows.length === 0) {
      throw new Error('Proposal not found or is no longer awaiting approval.');
    }
    return rows[0];
  }

  async findExecutionByProposalId(proposalId: string): Promise<AgentActionExecutionEntity | null> {
    const query = `
      SELECT * FROM app.agent_action_executions
      WHERE proposal_id = $1;
    `;
    const { rows } = await this.db.query(query, [proposalId]);
    return rows[0] || null;
  }

  async createExecution(params: {
    proposalId: string;
    organizationId: string;
    executedBy: string;
    idempotencyKey: string;
  }): Promise<AgentActionExecutionEntity> {
    const query = `
      INSERT INTO app.agent_action_executions (
        proposal_id, organization_id, executed_by, idempotency_key, execution_status
      ) VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *;
    `;
    const { rows } = await this.db.query(query, [
      params.proposalId,
      params.organizationId,
      params.executedBy,
      params.idempotencyKey,
    ]);
    return rows[0];
  }

  async updateExecutionOutcome(params: {
    proposalId: string;
    executionStatus: ExecutionStatus;
    targetEntityType?: string | null;
    targetEntityId?: string | null;
    executionResult?: Record<string, any> | null;
    errorDetails?: Record<string, any> | null;
  }): Promise<AgentActionExecutionEntity> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const query = `
        UPDATE app.agent_action_executions
        SET 
          execution_status = $2,
          target_entity_type = $3,
          target_entity_id = $4,
          execution_result = $5,
          error_details = $6,
          completed_at = NOW()
        WHERE proposal_id = $1
        RETURNING *;
      `;
      const { rows } = await client.query(query, [
        params.proposalId,
        params.executionStatus,
        params.targetEntityType || null,
        params.targetEntityId || null,
        params.executionResult ? JSON.stringify(params.executionResult) : null,
        params.errorDetails ? JSON.stringify(params.errorDetails) : null,
      ]);

      const proposalStatus: ProposalStatus = params.executionStatus === 'success' ? 'executed' : 'failed';
      await client.query(
        `UPDATE app.agent_action_proposals SET status = $1, updated_at = NOW() WHERE id = $2;`,
        [proposalStatus, params.proposalId]
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Fetches pending outbox events using FOR UPDATE SKIP LOCKED for high-concurrency safety.
   */
  async fetchPendingOutboxEvents(batchSize: number = 10, client?: PoolClient): Promise<AgentWorkflowOutboxEntity[]> {
    const dbClient = client || this.db;
    const query = `
      SELECT * FROM app.agent_workflow_outbox
      WHERE status IN ('pending', 'processing')
        AND next_attempt_at <= NOW()
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED;
    `;
    const { rows } = await dbClient.query(query, [batchSize]);
    return rows;
  }

  async markOutboxEventCompleted(id: string, client?: PoolClient): Promise<void> {
    const dbClient = client || this.db;
    const query = `
      UPDATE app.agent_workflow_outbox
      SET status = 'completed', processed_at = NOW()
      WHERE id = $1;
    `;
    await dbClient.query(query, [id]);
  }

  async markOutboxEventFailed(id: string, errorMessage: string, retryCount: number, maxRetries: number, client?: PoolClient): Promise<void> {
    const dbClient = client || this.db;
    const isTerminal = retryCount >= maxRetries;
    const status: OutboxEventStatus = isTerminal ? 'failed' : 'pending';
    // Exponential backoff: 2^attempt * 2 seconds
    const backoffSeconds = Math.min(60, Math.pow(2, retryCount) * 2);

    const query = `
      UPDATE app.agent_workflow_outbox
      SET 
        status = $2,
        retry_count = $3,
        last_error = $4,
        next_attempt_at = NOW() + INTERVAL '1 second' * $5
      WHERE id = $1;
    `;
    await dbClient.query(query, [id, status, retryCount, errorMessage, backoffSeconds]);
  }
}

export const agentApprovalRepository = new AgentApprovalRepository();
