import { z } from 'zod';

import { LIMITS } from '../constants';
import { cuidSchema, emailSchema, hexColorSchema } from './common';

/**
 * Board, sharing, and collaboration payload schemas.
 * Guest/viewer/editor roles are validated against the RBAC role set so the API
 * and DB never diverge.
 */

/** Roles that can be granted to a collaborator (Owner is implicit, not assignable). */
const assignableRoleSchema = z.enum(['ADMIN', 'EDITOR', 'VIEWER']);

export const createBoardSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.BOARD_NAME_MAX_LENGTH),
  /**
   * Target workspace. Optional: when omitted the board is created in the
   * caller's personal workspace (provisioned on first use). When provided, the
   * server verifies the caller holds EDITOR+ in it — a supplied id is never
   * trusted as proof of access (Guideline #2).
   */
  workspaceId: cuidSchema.optional(),
  background: hexColorSchema.optional(),
});

export const updateBoardSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.BOARD_NAME_MAX_LENGTH).optional(),
  background: hexColorSchema.optional(),
});

export const boardIdParamSchema = z.object({
  boardId: cuidSchema,
});

/** Invite a collaborator by email with a role. */
export const inviteCollaboratorSchema = z.object({
  boardId: cuidSchema,
  email: z.string().trim().toLowerCase().email(),
  role: assignableRoleSchema,
});

/** Change an existing collaborator's role. */
export const updateCollaboratorRoleSchema = z.object({
  boardId: cuidSchema,
  userId: cuidSchema,
  role: assignableRoleSchema,
});

/** Create a share link (public or restricted) with a role granted to visitors. */
export const createShareLinkSchema = z.object({
  boardId: cuidSchema,
  access: z.enum(['PUBLIC', 'RESTRICTED']),
  role: z.enum(['VIEWER', 'EDITOR']),
  /** Optional expiry — null means no expiry. */
  expiresAt: z.coerce.date().nullable().optional(),
});

/**
 * Canvas thumbnail upload (S3.4). A small rasterized preview as a base64 data
 * URL. Bounded here; the route additionally re-checks the decoded byte size.
 */
export const thumbnailUploadSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, {
      message: 'Invalid image data URL',
    })
    .max(400_000),
});

/** Add/update a board collaborator by email (S4.7). Target board id is the URL. */
export const boardCollaboratorBodySchema = z.object({
  email: emailSchema,
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER', 'GUEST']),
});

/** Create a share link (S4.7). Target board id is the URL. */
export const shareLinkBodySchema = z.object({
  access: z.enum(['PUBLIC', 'RESTRICTED']),
  role: z.enum(['VIEWER', 'EDITOR']),
  expiresAt: z.coerce.date().nullable().optional(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type ThumbnailUploadInput = z.infer<typeof thumbnailUploadSchema>;
export type BoardCollaboratorBodyInput = z.infer<typeof boardCollaboratorBodySchema>;
export type ShareLinkBodyInput = z.infer<typeof shareLinkBodySchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema>;
export type UpdateCollaboratorRoleInput = z.infer<typeof updateCollaboratorRoleSchema>;
export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>;
