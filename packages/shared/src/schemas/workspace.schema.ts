import { z } from 'zod';

import { LIMITS } from '../constants';
import { cuidSchema, emailSchema } from './common';

/**
 * Workspace + membership payload schemas (Sprint 4). Roles validate against the
 * workspace-role set so the API and DB never diverge.
 */

/** Roles an Owner/Admin may assign (Owner is transferred separately, not assigned). */
export const assignableWorkspaceRoleSchema = z.enum(['ADMIN', 'MEMBER', 'VIEWER']);

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.ORG_NAME_MAX_LENGTH),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: assignableWorkspaceRoleSchema,
});

export const updateMemberRoleSchema = z.object({
  userId: cuidSchema,
  role: assignableWorkspaceRoleSchema,
});

/** Body for changing a member's role (target userId comes from the URL). */
export const memberRoleBodySchema = z.object({
  role: assignableWorkspaceRoleSchema,
});

export const workspaceIdParamSchema = z.object({
  workspaceId: cuidSchema,
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
