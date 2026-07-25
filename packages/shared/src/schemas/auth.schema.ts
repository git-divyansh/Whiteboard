import { z } from 'zod';

import { emailSchema, passwordSchema } from './common';

/**
 * Auth-related payload schemas (Guideline #1). These define the *contract*;
 * the security session implements the handlers (Argon2id hashing, email
 * verification, MFA enrollment, lockout) against these validated inputs.
 */

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    name: z.string().trim().min(1).max(80),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Password is required' }),
  /** Optional TOTP code when MFA is enabled. */
  totp: z
    .string()
    .regex(/^\d{6}$/, { message: 'Enter the 6-digit code' })
    .optional(),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

/** MFA (authenticator app) enrollment + verification. */
export const mfaEnrollVerifySchema = z.object({
  totp: z.string().regex(/^\d{6}$/, { message: 'Enter the 6-digit code' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type MfaEnrollVerifyInput = z.infer<typeof mfaEnrollVerifySchema>;
