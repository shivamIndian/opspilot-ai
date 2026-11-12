import { z } from 'zod';

export const runWorkflowSchema = z.object({
  query: z
    .string({
      required_error: 'Query is required',
      invalid_type_error: 'Query must be a string',
    })
    .trim()
    .min(1, 'Query must not be empty')
    .max(5000, 'Query exceeds maximum allowed length of 5000 characters'),
  workflowVersion: z.string().trim().max(50).default('v1.0').optional(),
  threadId: z.string().uuid('Thread ID must be a valid UUID').optional(),
  correlationId: z.string().trim().max(100).optional(),
});

export const getWorkflowParamsSchema = z.object({
  organizationId: z.string().uuid('Organization ID must be a valid UUID'),
  runId: z.string().uuid('Run ID must be a valid UUID'),
});

export type RunWorkflowDto = z.infer<typeof runWorkflowSchema>;
