import type { AgentActionProposalEntity } from '../types/agent-approvals.types.js';

export class MakerCheckerViolationError extends Error {
  public statusCode: number = 403;
  public code: string = 'MAKER_CHECKER_VIOLATION';

  constructor(message: string = 'Self-approval is forbidden for high-risk agent proposals.') {
    super(message);
    this.name = 'MakerCheckerViolationError';
  }
}

export class ProposalStateConflictError extends Error {
  public statusCode: number = 409;
  public code: string = 'PROPOSAL_STATE_CONFLICT';

  constructor(message: string = 'Proposal is not awaiting approval.') {
    super(message);
    this.name = 'ProposalStateConflictError';
  }
}

export class MakerCheckerService {
  /**
   * Evaluates enterprise maker-checker rules before an approval/rejection can be executed.
   */
  validateDecisionEligibility(
    proposal: AgentActionProposalEntity,
    decidedByUserId: string,
    _userRole: string
  ): void {
    // 1. Verify proposal state is awaiting_approval
    if (proposal.status !== 'awaiting_approval') {
      throw new ProposalStateConflictError(
        `Action proposal '${proposal.id}' is already in '${proposal.status}' state.`
      );
    }

    // 2. Check for expiration
    if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
      throw new ProposalStateConflictError(`Action proposal '${proposal.id}' has expired.`);
    }

    // 3. Maker-Checker Enforcement for HIGH and CRITICAL risk levels:
    // The user who created/requested the action proposal CANNOT approve their own proposal.
    const isHighRisk = proposal.risk_level === 'high' || proposal.risk_level === 'critical';
    if (isHighRisk && proposal.requested_by === decidedByUserId) {
      throw new MakerCheckerViolationError(
        `Self-approval is forbidden for ${proposal.risk_level.toUpperCase()} risk proposals. Another authorized administrator must review and approve this action.`
      );
    }
  }
}

export const makerCheckerService = new MakerCheckerService();
