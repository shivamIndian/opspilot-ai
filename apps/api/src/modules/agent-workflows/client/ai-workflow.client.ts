import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import type {
  WorkflowRunData,
  PythonWorkflowApiResponse,
  WorkflowAnalyticsSummary,
  PythonWorkflowAnalyticsResponse,
  WorkflowRunListResult,
  PythonWorkflowListResponse,
  ListWorkflowRunsParams,
} from '../types/workflow.types.js';

export class AiWorkflowClientError extends Error {
  constructor(
    message: string,
    public errorCode: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AiWorkflowClientError';
  }
}

export interface SendWorkflowRunParams {
  requestId: string;
  organizationId: string;
  query: string;
  workflowVersion: string;
  threadId?: string;
  authenticatedUserId: string;
  delegatedAuthorizationToken: string;
  permittedScopes: string[];
  organizationRole: string;
  correlationId?: string;
}

export class AiWorkflowClient {
  private baseUrl: string;
  private internalToken: string;

  constructor(
    aiServiceUrl: string = config.AI_SERVICE_URL,
    internalToken: string = config.AI_SERVICE_INTERNAL_TOKEN
  ) {
    this.baseUrl = aiServiceUrl.replace(/\/+$/, '');
    this.internalToken = internalToken;
  }

  async runWorkflow(params: SendWorkflowRunParams): Promise<WorkflowRunData> {
    const targetUrl = `${this.baseUrl}/internal/v1/agent/workflows/run`;

    const payload = {
      request_id: params.requestId,
      organization_id: params.organizationId,
      query: params.query,
      workflow_version: params.workflowVersion,
      thread_id: params.threadId || null,
      authenticated_user_id: params.authenticatedUserId,
      delegated_authorization_token: params.delegatedAuthorizationToken,
      permitted_scopes: params.permittedScopes,
      organization_role: params.organizationRole,
      correlation_id: params.correlationId || null,
    };

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': this.internalToken,
        },
        body: JSON.stringify(payload),
      });

      const responseBody = (await response
        .json()
        .catch(() => null)) as PythonWorkflowApiResponse | null;

      if (!response.ok) {
        const errorMsg =
          responseBody?.error?.message || `AI Workflow service returned status ${response.status}`;
        const errorCode = responseBody?.error?.code || 'WORKFLOW_EXECUTION_ERROR';

        logger.error(`[AiWorkflowClient] Execution failed (${response.status}): ${errorMsg}`, {
          errorCode,
          details: responseBody?.error?.details,
        });

        throw new AiWorkflowClientError(
          errorMsg,
          errorCode,
          response.status,
          responseBody?.error?.details
        );
      }

      if (!responseBody || !responseBody.success || !responseBody.data) {
        const errorMsg =
          responseBody?.error?.message || 'Workflow service returned unsuccessful payload';
        const errorCode = responseBody?.error?.code || 'WORKFLOW_EXECUTION_ERROR';
        throw new AiWorkflowClientError(errorMsg, errorCode, response.status);
      }

      return responseBody.data;
    } catch (error) {
      if (error instanceof AiWorkflowClientError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to connect to AI Workflow service';
      logger.error(`[AiWorkflowClient] Network or service error: ${message}`);
      throw new AiWorkflowClientError(message, 'AI_WORKFLOW_SERVICE_UNAVAILABLE', 503);
    }
  }

  async getRunStatus(organizationId: string, runId: string): Promise<WorkflowRunData> {
    const targetUrl = `${this.baseUrl}/internal/v1/agent/workflows/${encodeURIComponent(runId)}?organization_id=${encodeURIComponent(organizationId)}`;

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'X-Internal-Service-Token': this.internalToken,
        },
      });

      const responseBody = (await response
        .json()
        .catch(() => null)) as PythonWorkflowApiResponse | null;

      if (!response.ok) {
        const errorMsg =
          responseBody?.error?.message || `AI Workflow service returned status ${response.status}`;
        const errorCode = responseBody?.error?.code || 'WORKFLOW_NOT_FOUND';

        throw new AiWorkflowClientError(
          errorMsg,
          errorCode,
          response.status,
          responseBody?.error?.details
        );
      }

      if (!responseBody || !responseBody.success || !responseBody.data) {
        const errorMsg = responseBody?.error?.message || 'Workflow run not found';
        throw new AiWorkflowClientError(errorMsg, 'WORKFLOW_NOT_FOUND', 404);
      }

      return responseBody.data;
    } catch (error) {
      if (error instanceof AiWorkflowClientError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Failed to retrieve workflow status';
      logger.error(`[AiWorkflowClient] Network or service error: ${message}`);
      throw new AiWorkflowClientError(message, 'AI_WORKFLOW_SERVICE_UNAVAILABLE', 503);
    }
  }

  async getWorkflowAnalytics(
    organizationId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<WorkflowAnalyticsSummary> {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);

    const targetUrl = `${this.baseUrl}/internal/v1/agent/workflows/analytics/summary?${params.toString()}`;

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'X-Internal-Service-Token': this.internalToken,
        },
      });

      const responseBody = (await response
        .json()
        .catch(() => null)) as PythonWorkflowAnalyticsResponse | null;

      if (!response.ok) {
        const errorMsg =
          responseBody?.error?.message ||
          `AI Workflow service analytics returned status ${response.status}`;
        const errorCode = responseBody?.error?.code || 'WORKFLOW_ANALYTICS_ERROR';

        throw new AiWorkflowClientError(
          errorMsg,
          errorCode,
          response.status,
          responseBody?.error?.details
        );
      }

      if (!responseBody || !responseBody.success || !responseBody.data) {
        // Fallback default empty summary if empty response
        return {
          total_runs: 0,
          successful_runs: 0,
          failed_runs: 0,
          waiting_approval_runs: 0,
          running_runs: 0,
          success_rate: 0,
          avg_duration_ms: 0,
          total_tool_calls: 0,
          recent_runs: [],
        };
      }

      return responseBody.data;
    } catch (error) {
      if (error instanceof AiWorkflowClientError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to retrieve workflow analytics';
      logger.error(`[AiWorkflowClient] Analytics error: ${message}`);
      // In case AI service is temporarily down, return gracefully degraded zeroed analytics instead of failing entire dashboard
      return {
        total_runs: 0,
        successful_runs: 0,
        failed_runs: 0,
        waiting_approval_runs: 0,
        running_runs: 0,
        success_rate: 0,
        avg_duration_ms: 0,
        total_tool_calls: 0,
        recent_runs: [],
      };
    }
  }

  async listWorkflowRuns(params: ListWorkflowRunsParams): Promise<WorkflowRunListResult> {
    const searchParams = new URLSearchParams({
      organization_id: params.organizationId,
      page: String(params.page || 1),
      limit: String(params.limit || 20),
    });

    if (params.status) searchParams.append('status', params.status);
    if (params.workflowName) searchParams.append('workflow_name', params.workflowName);
    if (params.search) searchParams.append('search', params.search);
    if (params.fromDate) searchParams.append('from_date', params.fromDate);
    if (params.toDate) searchParams.append('to_date', params.toDate);

    const targetUrl = `${this.baseUrl}/internal/v1/agent/workflows/runs?${searchParams.toString()}`;

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'X-Internal-Service-Token': this.internalToken,
        },
      });

      const responseBody = (await response
        .json()
        .catch(() => null)) as PythonWorkflowListResponse | null;

      if (!response.ok) {
        const errorMsg =
          responseBody?.error?.message ||
          `AI Workflow runs list returned status ${response.status}`;
        const errorCode = responseBody?.error?.code || 'WORKFLOW_LIST_ERROR';

        throw new AiWorkflowClientError(
          errorMsg,
          errorCode,
          response.status,
          responseBody?.error?.details
        );
      }

      if (!responseBody || !responseBody.success || !responseBody.data) {
        return {
          items: [],
          total: 0,
          page: params.page || 1,
          limit: params.limit || 20,
          total_pages: 1,
        };
      }

      return responseBody.data;
    } catch (error) {
      if (error instanceof AiWorkflowClientError) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to retrieve workflow runs list';
      logger.error(`[AiWorkflowClient] List runs error: ${message}`);
      return {
        items: [],
        total: 0,
        page: params.page || 1,
        limit: params.limit || 20,
        total_pages: 1,
      };
    }
  }
}

export const aiWorkflowClient = new AiWorkflowClient();
