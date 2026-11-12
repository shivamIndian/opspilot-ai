import { z } from 'zod';

export const documentStatusSchema = z.enum(['active', 'archived']);

export const documentExtensionSchema = z.enum(['pdf', 'docx', 'txt', 'md']);

export const updateDocumentSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'Display name cannot be empty')
      .max(255, 'Display name cannot exceed 255 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(5000, 'Description cannot exceed 5000 characters')
      .nullable()
      .optional(),
  })
  .refine(data => data.displayName !== undefined || data.description !== undefined, {
    message: 'At least one field (displayName or description) must be provided for update',
  });

export const uploadMetadataSchema = z.object({
  displayName: z.string().trim().max(255, 'Display name cannot exceed 255 characters').optional(),
  description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').optional(),
});

export const documentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: documentStatusSchema.optional(),
  fileType: documentExtensionSchema.optional(),
  uploadedBy: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z
    .enum(['created_at', 'updated_at', 'display_name', 'size_bytes'])
    .default('created_at')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type UploadMetadataInput = z.infer<typeof uploadMetadataSchema>;
export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;
