import 'server-only';

import { prisma } from '@whiteboard/db';
import {
  AppError,
  ROLE_PERMISSIONS,
  can,
  effectiveBoardRole,
  type AuthUser,
  type BoardAuthContext,
  type Permission,
  type Role,
} from '@whiteboard/shared';

/**
 * Board authorization resolver (Guideline #2 / #22). This is the single place
 * that maps (user, board) → role. Every board-scoped action — API routes and
 * realtime-token minting — must go through `requireBoardPermission`.
 *
 * Precedence: explicit board collaborator > workspace membership. The security
 * session extends this with share-link / guest-token resolution.
 */
export async function resolveBoardRole(userId: string, boardId: string): Promise<Role | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      createdById: true,
      collaborators: { where: { userId }, select: { role: true }, take: 1 },
      workspace: {
        select: { members: { where: { userId }, select: { role: true }, take: 1 } },
      },
    },
  });
  if (!board) {
    return null;
  }

  // Creator > workspace Owner/Admin (inherited) > explicit board grant >
  // workspace default (Member→Editor, Viewer→Viewer). See effectiveBoardRole.
  return effectiveBoardRole({
    isCreator: board.createdById === userId,
    workspaceRole: board.workspace.members[0]?.role ?? null,
    boardGrant: board.collaborators[0]?.role ?? null,
  });
}

/**
 * Assert `user` holds `permission` on `board`, returning the resolved auth
 * context. Throws FORBIDDEN otherwise. Never trusts a client-supplied role.
 */
export async function requireBoardPermission(
  user: AuthUser,
  boardId: string,
  permission: Permission,
): Promise<BoardAuthContext> {
  const role = await resolveBoardRole(user.id, boardId);
  if (!role) {
    throw AppError.forbidden('You do not have access to this board');
  }
  if (!can(role, permission)) {
    throw AppError.forbidden();
  }
  return { user, boardId, role, permissions: ROLE_PERMISSIONS[role] };
}
