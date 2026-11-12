export type ProposalRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ProposalStatus =
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'
  | 'cancelled';

export type ApprovalDecision = 'approved' | 'rejected';

export type ExecutionStatus = 'pending' | 'success' | 'failed';

export type OutboxEventStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AgentActionProposalEntity {
  id: string;
  organization_id: string;
  run_id: string;
  thread_id: string;
  requested_by: string;
  action_type: string;
  tool_name: string;
  risk_level: ProposalRiskLevel;
  proposal_payload: Record<string, any>;
  status: ProposalStatus;
  justification: string | null;
  policy_snapshot: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
  expires_at: Date | null;
}

export interface AgentActionApprovalEntity {
  id: string;
  proposal_id: string;
  organization_id: string;
  decision: ApprovalDecision;
  decided_by: string;
  decision_reason: string | null;
  decided_at: Date;
}

export interface AgentActionExecutionEntity {
  id: string;
  proposal_id: string;
  organization_id: string;
  executed_by: string;
  execution_status: ExecutionStatus;
  target_entity_type: string | null;
  target_entity_id: string | null;
  execution_result: Record<string, any> | null;
  error_details: Record<string, any> | null;
  idempotency_key: string;
  started_at: Date;
  completed_at: Date | null;
}

export interface AgentWorkflowOutboxEntity {
  id: string;
  proposal_id: string;
  organization_id: string;
  event_type: string;
  payload: Record<string, any>;
  status: OutboxEventStatus;
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  created_at: Date;
  processed_at: Date | null;
  next_attempt_at: Date;
}

export interface SafeAgentProposal {
  id: string;
  organizationId: string;
  runId: string;
  threadId: string;
  requestedBy: string;
  requesterName?: string;
  requesterEmail?: string;
  actionType: string;
  toolName: string;
  riskLevel: ProposalRiskLevel;
  proposedAction: Record<string, any>;
  status: ProposalStatus;
  justification: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  approval?: SafeAgentApproval | null;
  execution?: SafeAgentExecution | null;
}

export interface SafeAgentApproval {
  id: string;
  proposalId: string;
  organizationId: string;
  decision: ApprovalDecision;
  decidedBy: string;
  deciderName?: string;
  deciderEmail?: string;
  decisionReason: string | null;
  decidedAt: string;
}

export interface SafeAgentExecution {
  id: string;
  proposalId: string;
  organizationId: string;
  executedBy: string;
  executionStatus: ExecutionStatus;
  targetEntityType: string | null;
  targetEntityId: string | null;
  executionResult: Record<string, any> | null;
  errorDetails: Record<string, any> | null;
  idempotencyKey: string;
  startedAt: string;
  completedAt: string | null;
}
