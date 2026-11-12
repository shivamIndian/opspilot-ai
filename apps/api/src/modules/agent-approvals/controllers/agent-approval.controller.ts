import type { Request, Response, NextFunction } from 'express';
import { config } from '../../../config/env.js';
import {
  agentApprovalService,
  AgentApprovalService,
} from '../services/agent-approval.service.js';
import {
  agentExecutionGatewayService,
  AgentExecutionGatewayService,
} from '../services/agent-execution-gateway.service.js';
import {
  listProposalsQuerySchema,
  approveProposalSchema,
  rejectProposalSchema,
  cancelProposalSchema,
  executeProposalSchema,
} from '../validators/agent-approvals.schema.js';

export class AgentApprovalController {
  constructor(
    private approvalService: AgentApprovalService = agentApprovalService,
    private executionGateway: AgentExecutionGatewayService = agentExecutionGatewayService
  ) {}

  listProposals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.params.organizationId;
      const query = listProposalsQuerySchema.parse(req.query);

      const result = await this.approvalService.listProposals(organizationId, {
        status: query.status,
        riskLevel: query.riskLevel,
        page: query.page,
        limit: query.limit,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  getProposalDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, proposalId } = req.params;
      const proposal = await this.approvalService.getProposalDetails(organizationId, proposalId);

      res.status(200).json({
        success: true,
        data: proposal,
      });
    } catch (err) {
      next(err);
    }
  };

  approveProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, proposalId } = req.params;
      const userId = (req as any).user?.id || (req as any).userId;
      const userRole = (req as any).organizationRole || (req as any).role || 'member';
      const input = approveProposalSchema.parse(req.body);

      const approved = await this.approvalService.approveProposal(
        organizationId,
        proposalId,
        userId,
        userRole,
        input
      );

      res.status(200).json({
        success: true,
        message: 'Action proposal approved successfully. Dispatched for execution.',
        data: approved,
      });
    } catch (err) {
      next(err);
    }
  };

  rejectProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, proposalId } = req.params;
      const userId = (req as any).user?.id || (req as any).userId;
      const userRole = (req as any).organizationRole || (req as any).role || 'member';
      const input = rejectProposalSchema.parse(req.body);

      const rejected = await this.approvalService.rejectProposal(
        organizationId,
        proposalId,
        userId,
        userRole,
        input
      );

      res.status(200).json({
        success: true,
        message: 'Action proposal rejected.',
        data: rejected,
      });
    } catch (err) {
      next(err);
    }
  };

  cancelProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, proposalId } = req.params;
      const userId = (req as any).user?.id || (req as any).userId;
      const userRole = (req as any).organizationRole || (req as any).role || 'member';
      const input = cancelProposalSchema.parse(req.body);

      const cancelled = await this.approvalService.cancelProposal(
        organizationId,
        proposalId,
        userId,
        userRole,
        input
      );

      res.status(200).json({
        success: true,
        message: 'Action proposal cancelled.',
        data: cancelled,
      });
    } catch (err) {
      next(err);
    }
  };

  executeProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Service-to-service internal authentication check
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_SERVICE',
            message: 'Missing or malformed internal service Authorization header',
          },
        });
        return;
      }

      const serviceToken = authHeader.split(' ')[1];
      if (serviceToken !== config.AI_SERVICE_INTERNAL_TOKEN) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SERVICE_TOKEN',
            message: 'Invalid internal service authentication credentials',
          },
        });
        return;
      }

      const { proposalId } = req.params;
      const organizationId = (req.headers['x-organization-id'] as string) || req.body.organizationId;
      const userId = (req.headers['x-user-id'] as string) || (req as any).user?.id;
      const input = executeProposalSchema.parse(req.body);

      if (!organizationId) {
        res.status(400).json({ success: false, error: 'Missing organization identifier.' });
        return;
      }

      const execution = await this.executionGateway.executeApprovedProposal(
        organizationId,
        proposalId,
        userId,
        input.idempotencyKey
      );

      res.status(200).json({
        success: true,
        message: 'Proposal action executed successfully.',
        data: execution,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const agentApprovalController = new AgentApprovalController();
