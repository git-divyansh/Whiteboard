import 'server-only';

import { prisma } from '@whiteboard/db';
import {
  AppError,
  canCreateBoardInWorkspace,
  canManageWorkspace,
  type AuthUser,
  type WorkspaceRole,
} from '@whiteboard/shared';

/**
 * Workspace access resolution for board creation (Guideline #2 / #22).
 *
 * Two entry points, both returning a workspace id the caller is authorised to
 * create boards in. A client-supplied `workspaceId` is never trusted as proof
 * of access — membership and role are always re-checked against the database.
 */

/**
 * Verify `userId` may create boards in `workspaceId`, returning it on success.
 * Throws FORBIDDEN if they are not a member or are only a Viewer.
 */
export async function requireWorkspaceCreateAccess(
  userId: string,
  workspaceId: string,
): Promise<string> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  if (!membership) {
    throw AppError.forbidden('You are not a member of this workspace');
  }
  if (!canCreateBoardInWorkspace(membership.role)) {
    throw AppError.forbidden('Viewers cannot create boards in this workspace');
  }
  return workspaceId;
}

/** The caller's workspace role, or null if they are not a member. */
export async function getWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | null> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

/** Assert membership, returning the role. Throws FORBIDDEN otherwise. */
export async function requireWorkspaceMembership(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole> {
  const role = await getWorkspaceRole(userId, workspaceId);
  if (!role) {
    throw AppError.forbidden('You are not a member of this workspace');
  }
  return role;
}

/** Assert Owner/Admin (member management). Throws FORBIDDEN otherwise. */
export async function requireWorkspaceManage(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole> {
  const role = await requireWorkspaceMembership(userId, workspaceId);
  if (!canManageWorkspace(role)) {
    throw AppError.forbidden('Only owners and admins can manage members');
  }
  return role;
}

/**
 * Resolve the user's default workspace, provisioning a personal organization +
 * workspace (owned by the user) on first use. Guarantees every authenticated
 * user has exactly one home they can create boards in — so board creation works
 * immediately after an OAuth sign-up, before any team is set up.
 */
export async function ensureDefaultWorkspace(user: AuthUser): Promise<string> {
  // Reuse any existing workspace the user can already create in (Member+).
  const existing = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, role: { in: ['OWNER', 'ADMIN', 'MEMBER'] } },
    orderBy: { createdAt: 'asc' },
    select: { workspaceId: true },
  });
  if (existing) {
    return existing.workspaceId;
  }

  // Provision a personal org (idempotent by slug) + a fresh owned workspace.
  const label = user.name?.trim() || user.email.split('@')[0] || 'Personal';
  const org = await prisma.organization.upsert({
    where: { slug: `personal-${user.id}` },
    update: {},
    create: { name: `${label}'s Space`, slug: `personal-${user.id}`, ownerId: user.id },
    select: { id: true },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'My Workspace',
      organizationId: org.id,
      members: { create: { userId: user.id, role: 'OWNER' } },
    },
    select: { id: true },
  });
  return workspace.id;
}
