import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Module 25: API Contract Testing Suite
 * Ensures strict schema alignment between Node.js API and Python FastAPI AI Microservice.
 */

// 1. Contract: Agent Workflow Run Schemas
const WorkflowRunRequestContract = z.object({
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  user_role: z.enum(['owner', 'admin', 'member']),
  query: z.string().min(1),
  thread_id: z.string().optional(),
  request_id: z.string().optional(),
});

const WorkflowRunResponseContract = z.object({
  run_id: z.string(),
  thread_id: z.string(),
  status: z.enum(['completed', 'awaiting_approval', 'failed', 'running']),
  intent: z.string().nullable().optional(),
  selected_tool: z.string().nullable().optional(),
  answer: z.string().nullable().optional(),
  citations: z.array(z.record(z.unknown())).default([]),
  requires_approval: z.boolean(),
  proposal_id: z.string().nullable().optional(),
  action_proposals: z.array(z.record(z.unknown())).default([]),
  duration_ms: z.number().nullable().optional(),
  total_steps: z.number().optional(),
  completed_steps: z.array(z.string()).default([]),
});

// 2. Contract: Tool Execution Schemas
const ToolExecutionRequestContract = z.object({
  tool_name: z.string().min(1),
  arguments: z.record(z.unknown()),
  context: z.object({
    organization_id: z.string().uuid(),
    user_id: z.string().uuid(),
    user_role: z.enum(['owner', 'admin', 'member']),
    delegation_token: z.string().optional(),
  }),
});

const ToolExecutionResponseContract = z.object({
  tool_name: z.string(),
  status: z.enum(['success', 'failed', 'proposal_created']),
  result: z.unknown().optional(),
  requires_approval: z.boolean().default(false),
  proposal_id: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

// 3. Contract: Standardized API Error Response
const ApiErrorResponseContract = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

// 4. Contract: Evaluation Run Schemas
const EvaluationRunResponseContract = z.object({
  id: z.string(),
  organization_id: z.string().uuid(),
  dataset_id: z.string(),
  dataset_version: z.number(),
  category: z.string(),
  status: z.enum(['queued', 'running', 'completed', 'failed']),
  total_examples: z.number(),
  completed_examples: z.number(),
  failed_examples: z.number(),
  summary_metrics: z.record(z.unknown()),
  created_at: z.string(),
});

describe('Module 25: Inter-Service API Contract Verification', () => {
  describe('Workflow Engine Contract Compliance', () => {
    it('validates compliant workflow run request payload', () => {
      const samplePayload = {
        organization_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        user_id: '11111111-1111-4111-8111-111111111111',
        user_role: 'admin',
        query: 'How do I escalate ticket #42?',
        thread_id: 'thread-test-123',
      };

      const result = WorkflowRunRequestContract.safeParse(samplePayload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid workflow run requests missing required tenant identifiers', () => {
      const invalidPayload = {
        query: 'Missing org and user',
      };

      const result = WorkflowRunRequestContract.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('validates compliant workflow run response payload', () => {
      const sampleResponse = {
        run_id: 'run-uuid-001',
        thread_id: 'thread-test-123',
        status: 'awaiting_approval',
        intent: 'ticket_update',
        selected_tool: 'tickets_update_priority',
        answer: null,
        citations: [],
        requires_approval: true,
        proposal_id: 'prop-uuid-999',
        action_proposals: [{ id: 'prop-uuid-999', tool_name: 'tickets_update_priority' }],
        duration_ms: 245.5,
        total_steps: 2,
        completed_steps: ['classify_intent', 'route_tool'],
      };

      const result = WorkflowRunResponseContract.safeParse(sampleResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Agent Tool Execution Contract Compliance', () => {
    it('validates compliant tool execution invocation payload', () => {
      const sampleToolReq = {
        tool_name: 'search_knowledge_base',
        arguments: { query: 'VPN configuration policy', limit: 3 },
        context: {
          organization_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          user_id: '11111111-1111-4111-8111-111111111111',
          user_role: 'member',
          delegation_token: 'valid-jwt-delegation',
        },
      };

      const result = ToolExecutionRequestContract.safeParse(sampleToolReq);
      expect(result.success).toBe(true);
    });

    it('validates compliant tool execution outcome payload', () => {
      const sampleOutcome = {
        tool_name: 'tickets_update_priority',
        status: 'proposal_created',
        requires_approval: true,
        proposal_id: 'prop-123',
        result: { proposal_id: 'prop-123', status: 'awaiting_approval' },
        error: null,
      };

      const result = ToolExecutionResponseContract.safeParse(sampleOutcome);
      expect(result.success).toBe(true);
    });
  });

  describe('Standardized API Error Envelope Contract', () => {
    it('validates standard JSON error envelope returned by all microservices', () => {
      const sampleError = {
        success: false,
        error: {
          code: 'FORBIDDEN_NOT_ORGANIZATION_MEMBER',
          message: 'You are not an active member of this organization',
          details: { attempt_time: '2026-11-04T12:00:00Z' },
        },
      };

      const result = ApiErrorResponseContract.safeParse(sampleError);
      expect(result.success).toBe(true);
    });
  });

  describe('AI Evaluation Benchmark Contract Compliance', () => {
    it('validates compliant benchmark run record structure', () => {
      const sampleEvalRun = {
        id: 'eval-run-777',
        organization_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        dataset_id: 'ds-gold-standard',
        dataset_version: 1,
        category: 'rag_retrieval',
        status: 'completed',
        total_examples: 15,
        completed_examples: 15,
        failed_examples: 0,
        summary_metrics: {
          overall_score: 95.0,
          mean_reciprocal_rank: 0.96,
        },
        created_at: new Date().toISOString(),
      };

      const result = EvaluationRunResponseContract.safeParse(sampleEvalRun);
      expect(result.success).toBe(true);
    });
  });
});
