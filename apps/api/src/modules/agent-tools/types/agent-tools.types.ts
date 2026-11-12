import type { Request } from 'express';
import type { OrganizationMemberEntity } from '../../organizations/types/organization.types.js';

export interface DelegatedTokenPayload {
  sub: string; // userId
  orgId: string; // organizationId
  requestId: string;
  scopes: string[];
  iss: string;
  aud: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export type ToolProposalStatus = 'awaiting_approval' | 'approved' | 'rejected' | 'cancelled';

export interface ToolActionProposal {
  proposalId: string;
  organizationId: string;
  requestedBy: string;
  toolName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  approvalRequired: boolean;
  executionMode: 'read_only' | 'proposal_only';
  proposedAction: Record<string, unknown>;
  status: ToolProposalStatus;
  createdAt: string;
}

export interface ToolExecutionContextData {
  userId: string;
  organizationId: string;
  membership: OrganizationMemberEntity;
  scopes: string[];
  requestId: string;
  correlationId?: string;
}

export interface AuthenticatedToolRequest extends Request {
  toolContext?: ToolExecutionContextData;
}
