import { logger } from '../utils/logger.js';
import {
  agentApprovalRepository,
  AgentApprovalRepository,
} from '../modules/agent-approvals/repositories/agent-approval.repository.js';
import {
  agentExecutionGatewayService,
  AgentExecutionGatewayService,
} from '../modules/agent-approvals/services/agent-execution-gateway.service.js';
import { config } from '../config/env.js';

export interface WorkflowResumePayload {
  thread_id: string;
  proposal_id: string;
  decision: 'approved' | 'rejected';
  decided_by?: string;
  decision_reason?: string | null;
  execution_result?: Record<string, any> | null;
}

export class AgentApprovalOutboxWorker {
  private isRunning: boolean = false;
  private pollIntervalMs: number = 3000;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private approvalRepo: AgentApprovalRepository = agentApprovalRepository,
    private executionGateway: AgentExecutionGatewayService = agentExecutionGatewayService,
    private aiServiceUrl: string = process.env.AI_SERVICE_URL || 'http://localhost:8000'
  ) {}

  /**
   * Dispatches workflow resumption signal to the Python LangGraph AI service.
   */
  async notifyAiServiceResumption(payload: WorkflowResumePayload): Promise<void> {
    const url = `${this.aiServiceUrl}/internal/v1/agent/workflows/resume`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service-token': config.AI_SERVICE_INTERNAL_TOKEN,
          Authorization: `Bearer ${config.AI_SERVICE_INTERNAL_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(
          `[AgentApprovalOutboxWorker] AI service resumption returned ${response.status}: ${errorText}`
        );
      } else {
        logger.info(
          `[AgentApprovalOutboxWorker] Resumed workflow for thread '${payload.thread_id}', proposal '${payload.proposal_id}'`
        );
      }
    } catch (err: any) {
      logger.warn(
        `[AgentApprovalOutboxWorker] Failed to reach AI service at '${url}' for workflow resumption: ${err.message}`
      );
      // We don't fail the outbox job permanently if AI service is temporarily offline,
      // but re-throw if needed for retry
    }
  }

  /**
   * Processes a single batch of outbox events under FOR UPDATE SKIP LOCKED.
   * Returns count of processed events.
   */
  async processBatch(batchSize: number = 10): Promise<number> {
    const events = await this.approvalRepo.fetchPendingOutboxEvents(batchSize);
    if (events.length === 0) return 0;

    logger.info(`[AgentApprovalOutboxWorker] Processing ${events.length} pending outbox event(s)...`);

    for (const event of events) {
      try {
        const payload = event.payload || {};
        const { proposalId, organizationId, threadId, decision, decidedBy, decisionReason } = payload;

        let executionResult: Record<string, any> | null = null;

        if (event.event_type === 'PROPOSAL_APPROVED') {
          // 1. Idempotently execute approved business action via execution gateway
          const execution = await this.executionGateway.executeApprovedProposal(
            organizationId,
            proposalId,
            decidedBy
          );
          executionResult = execution.executionResult;
        }

        // 2. Notify Python LangGraph AI Service to resume graph execution
        if (threadId) {
          await this.notifyAiServiceResumption({
            thread_id: threadId,
            proposal_id: proposalId,
            decision: decision || (event.event_type === 'PROPOSAL_APPROVED' ? 'approved' : 'rejected'),
            decided_by: decidedBy,
            decision_reason: decisionReason,
            execution_result: executionResult,
          });
        }

        // 3. Mark outbox event completed
        await this.approvalRepo.markOutboxEventCompleted(event.id);
        logger.info(
          `[AgentApprovalOutboxWorker] Successfully processed outbox event '${event.id}' (${event.event_type})`
        );
      } catch (err: any) {
        logger.error(
          `[AgentApprovalOutboxWorker] Error processing outbox event '${event.id}': ${err.message}`,
          err
        );
        await this.approvalRepo.markOutboxEventFailed(
          event.id,
          err.message,
          event.retry_count + 1,
          event.max_retries
        );
      }
    }

    return events.length;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('[AgentApprovalOutboxWorker] Outbox worker started.');

    const runLoop = async () => {
      if (!this.isRunning) return;
      try {
        await this.processBatch();
      } catch (err: any) {
        logger.error(`[AgentApprovalOutboxWorker] Batch loop error: ${err.message}`);
      } finally {
        if (this.isRunning) {
          this.timer = setTimeout(runLoop, this.pollIntervalMs);
        }
      }
    };

    runLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info('[AgentApprovalOutboxWorker] Outbox worker stopped.');
  }
}

export const agentApprovalOutboxWorker = new AgentApprovalOutboxWorker();
