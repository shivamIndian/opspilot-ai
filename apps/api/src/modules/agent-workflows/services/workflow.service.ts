import crypto from 'node:crypto';
import { delegationTokenService } from '../../agent-tools/services/delegation-token.service.js';
import {
  aiWorkflowClient,
  AiWorkflowClient,
  AiWorkflowClientError,
} from '../client/ai-workflow.client.js';
import { logger } from '../../../utils/logger.js';
import type { RunWorkflowServiceParams, WorkflowRunData } from '../types/workflow.types.js';

export class WorkflowService {
  constructor(private client: AiWorkflowClient = aiWorkflowClient) {}

  /**
   * Resolves the delegation scopes allowed for a user based on their organization role.
   */
  private resolveRoleScopes(role: string): string[] {
    const normalizedRole = role.toLowerCase();

    if (normalizedRole === 'viewer') {
      return [
        'tools:read',
        'tools:knowledge:read',
        'tools:tickets:read',
        'tools:users:read',
        'tools:history:read',
        'tickets:read',
        'users:read',
        'documents:read',
        'knowledge:read',
      ];
    }

    // Member, Admin, Owner have full operational tool scopes
    return [
      'tools:read',
      'tools:write',
      'tools:knowledge:read',
      'tools:tickets:read',
      'tools:tickets:write',
      'tools:users:read',
      'tools:history:read',
      'tickets:read',
      'tickets:write',
      'users:read',
      'documents:read',
      'knowledge:read',
    ];
  }

  /**
   * Initiates an OpsPilot LangGraph workflow run on behalf of an authenticated organization member.
   */
  async runWorkflow(params: RunWorkflowServiceParams): Promise<WorkflowRunData> {
    const requestId = crypto.randomUUID();
    const threadId = params.threadId || crypto.randomUUID();
    const correlationId = params.correlationId || requestId;
    const permittedScopes = this.resolveRoleScopes(params.userRole);

    logger.info(
      `[WorkflowService] Initiating workflow run for org=${params.organizationId}, user=${params.userId}, role=${params.userRole}, req=${requestId}`
    );

    // 1. Generate short-lived delegated authorization assertion
    const delegation = delegationTokenService.generateDelegationToken({
      userId: params.userId,
      organizationId: params.organizationId,
      requestId,
      scopes: permittedScopes,
      expiresIn: '15m',
    });

    // 2. Delegate execution to Python AI Service
    const result = await this.client.runWorkflow({
      requestId,
      organizationId: params.organizationId,
      query: params.query,
      workflowVersion: params.workflowVersion || 'v1.0',
      threadId,
      authenticatedUserId: params.userId,
      delegatedAuthorizationToken: delegation.token,
      permittedScopes,
      organizationRole: params.userRole,
      correlationId,
    });

    logger.info(
      `[WorkflowService] Workflow run completed with status=${result.status}, duration=${result.duration_ms}ms, req=${requestId}`
    );

    return result;
  }

  /**
   * Retrieves the status, step progression, and results of an existing workflow run.
   */
  async getWorkflowStatus(
    organizationId: string,
    _userId: string,
    runId: string
  ): Promise<WorkflowRunData> {
    const runData = await this.client.getRunStatus(organizationId, runId);

    // Enforce strict tenant isolation: verify returned record matches requesting organization
    if (runData.organization_id !== organizationId) {
      throw new AiWorkflowClientError('Workflow run not found', 'WORKFLOW_NOT_FOUND', 404);
    }

    return runData;
  }
}

export const workflowService = new WorkflowService();
