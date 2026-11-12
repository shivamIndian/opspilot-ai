import { z } from 'zod';

const WEAK_PASSWORDS = new Set([
  'password123456',
  '123456789012',
  'qwertyuiop12',
  'administrator1',
  'welcome123456',
  'changeme12345',
  'iloveyou12345',
  'trustnoone123',
  'letmein123456',
  'sunshine12345',
]);

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .refine(val => val.trim().length >= 12, {
    message: 'Password cannot consist entirely of whitespace',
  })
  .refine(val => !WEAK_PASSWORDS.has(val.toLowerCase()), {
    message:
      'The chosen password is too common or easily guessed. Please select a stronger passphrase.',
  });

export const emailSchema = z
  .string()
  .email('Invalid email address format')
  .transform(val => val.trim().toLowerCase());

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters')
    .transform(val => val.trim()),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
