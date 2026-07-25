import { z } from 'zod';

import { LIMITS } from '../constants';

/**
 * Reusable primitive schemas. Every endpoint composes from these so validation
 * rules (Guideline #4) stay consistent and are tightened in exactly one place.
 */

/** Prisma generates collision-resistant ids with `cuid()`. Validate that shape. */
export const cuidSchema = z.string().cuid({ message: 'Invalid id' });

/** Some external ids (e.g. OAuth) are UUIDs. */
export const uuidSchema = z.string().uuid({ message: 'Invalid id' });

/** A generic resource id accepted at API boundaries (cuid today, tolerant of both). */
export const idSchema = z.union([cuidSchema, uuidSchema]);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Invalid email address' })
  .max(254);

/**
 * Password policy for the foundation. The security session may raise this
 * (breach-list checks, entropy scoring) — callers depend only on this schema.
 */
export const passwordSchema = z
  .string()
  .min(12, { message: 'Password must be at least 12 characters' })
  .max(128, { message: 'Password must be at most 128 characters' });

/** #RRGGBB or #RRGGBBAA hex color. */
export const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, { message: 'Invalid color' });

/** Finite number guard — rejects NaN/Infinity that can slip through JSON. */
export const finiteNumber = z.number().finite();

/** Cursor / offset pagination shared by list endpoints. */
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIMITS.PAGE_SIZE_MAX)
    .default(LIMITS.PAGE_SIZE_DEFAULT),
});

export type Pagination = z.infer<typeof paginationSchema>;
