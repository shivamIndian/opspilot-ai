import { z } from 'zod';

export const listProposalsQuerySchema = z.object({
  status: z
    .enum(['awaiting_approval', 'approved', 'rejected', 'executed', 'failed', 'cancelled'])
    .optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListProposalsQuery = z.infer<typeof listProposalsQuerySchema>;

export const approveProposalSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export type ApproveProposalInput = z.infer<typeof approveProposalSchema>;

export const rejectProposalSchema = z.object({
  reason: z.string().min(3, 'Rejection reason must be at least 3 characters').max(2000),
});

export type RejectProposalInput = z.infer<typeof rejectProposalSchema>;

export const cancelProposalSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export type CancelProposalInput = z.infer<typeof cancelProposalSchema>;

export const executeProposalSchema = z.object({
  idempotencyKey: z.string().min(1).max(128).optional(),
});

export type ExecuteProposalInput = z.infer<typeof executeProposalSchema>;
