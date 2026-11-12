import { z } from 'zod';

export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters long')
    .max(150, 'Organization name cannot exceed 150 characters')
    .trim(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .toLowerCase()
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and single hyphens')
    .optional(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional()
    .nullable(),
});

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters long')
    .max(150, 'Organization name cannot exceed 150 characters')
    .trim()
    .optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .toLowerCase()
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and single hyphens')
    .optional(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional()
    .nullable(),
  logo_url: z.string().url('Logo URL must be a valid URL').optional().nullable().or(z.literal('')),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Please provide a valid email address').toLowerCase().trim(),
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: "Invitation role must be either 'admin' or 'member'" }),
  }),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: "Role must be either 'admin' or 'member'" }),
  }),
});

export const transferOwnershipSchema = z.object({
  newOwnerUserId: z.string().uuid('Target new owner must be a valid UUID'),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(10, 'Invitation token must be at least 10 characters'),
});

export const organizationIdParamSchema = z.object({
  organizationId: z.string().uuid('Organization ID must be a valid UUID'),
});

export const memberIdParamSchema = z.object({
  organizationId: z.string().uuid('Organization ID must be a valid UUID'),
  memberId: z.string().uuid('Member ID must be a valid UUID'),
});

export const invitationIdParamSchema = z.object({
  organizationId: z.string().uuid('Organization ID must be a valid UUID'),
  invitationId: z.string().uuid('Invitation ID must be a valid UUID'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
