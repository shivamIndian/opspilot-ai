import { z } from 'zod';

export const knowledgeSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'Search query cannot be empty')
    .max(1000, 'Search query cannot exceed 1000 characters'),
  topK: z.coerce.number().int().min(1).max(20).default(5),
  retrievalMode: z.enum(['hybrid', 'semantic', 'keyword']).default('hybrid'),
  filters: z
    .object({
      documentIds: z.array(z.string().uuid()).optional(),
      fileTypes: z.array(z.string().trim().toLowerCase()).optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    })
    .optional(),
  minScore: z.number().min(0).max(1).optional(),
  maxChunksPerDoc: z.number().int().min(1).optional(),
});

export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchSchema>;

export const knowledgeAnswerSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'Query cannot be empty')
    .max(5000, 'Query cannot exceed 5000 characters'),
  topK: z.coerce.number().int().min(1).max(20).default(5),
  retrievalMode: z.enum(['hybrid', 'semantic', 'keyword']).default('hybrid'),
  filters: z
    .object({
      documentIds: z.array(z.string().uuid()).optional(),
      fileTypes: z.array(z.string().trim().toLowerCase()).optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    })
    .optional(),
});

export type KnowledgeAnswerInput = z.infer<typeof knowledgeAnswerSchema>;
