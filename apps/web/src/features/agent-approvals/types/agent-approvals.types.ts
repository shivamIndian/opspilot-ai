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

export interface ApprovalFilterParams {
  status?: ProposalStatus;
  riskLevel?: ProposalRiskLevel;
  page?: number;
  limit?: number;
}
