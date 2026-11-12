import { z } from 'zod';

export const ticketStatusSchema = z.enum([
  'open',
  'in_progress',
  'waiting_on_customer',
  'resolved',
  'closed',
]);

export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const ticketCategorySchema = z.enum([
  'technical_support',
  'account_access',
  'bug_report',
  'billing',
  'feature_request',
  'general',
]);

export const commentVisibilitySchema = z.enum(['public', 'internal']);

export const createTicketSchema = z.object({
  subject: z
    .string({ required_error: 'Subject is required' })
    .trim()
    .min(3, 'Subject must be at least 3 characters')
    .max(200, 'Subject cannot exceed 200 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(10000, 'Description cannot exceed 10000 characters'),
  category: ticketCategorySchema,
  priority: ticketPrioritySchema.default('medium').optional(),
});

export const updateTicketSchema = z
  .object({
    subject: z
      .string()
      .trim()
      .min(3, 'Subject must be at least 3 characters')
      .max(200, 'Subject cannot exceed 200 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .min(5, 'Description must be at least 5 characters')
      .max(10000, 'Description cannot exceed 10000 characters')
      .optional(),
    category: ticketCategorySchema.optional(),
  })
  .refine(
    data =>
      data.subject !== undefined || data.description !== undefined || data.category !== undefined,
    {
      message: 'At least one field (subject, description, or category) must be provided for update',
    }
  );

export const assignTicketSchema = z.object({
  assignedToUserId: z.string().uuid('Assignee ID must be a valid UUID').nullable().optional(),
});

export const updatePrioritySchema = z.object({
  priority: ticketPrioritySchema,
});

export const updateStatusSchema = z.object({
  status: ticketStatusSchema,
});

export const createCommentSchema = z.object({
  body: z
    .string({ required_error: 'Comment body is required' })
    .trim()
    .min(1, 'Comment body cannot be empty')
    .max(5000, 'Comment body cannot exceed 5000 characters'),
  visibility: commentVisibilitySchema.default('public').optional(),
});

export const ticketQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  category: ticketCategorySchema.optional(),
  assignedTo: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  sortBy: z
    .enum(['created_at', 'updated_at', 'ticket_number', 'priority', 'status'])
    .default('created_at')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  archived: z
    .preprocess(val => {
      if (typeof val === 'string') return val.toLowerCase() === 'true';
      return Boolean(val);
    }, z.boolean())
    .optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type UpdatePriorityInput = z.infer<typeof updatePrioritySchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type TicketQueryInput = z.infer<typeof ticketQuerySchema>;
