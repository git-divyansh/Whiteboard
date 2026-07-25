import { prisma } from '@whiteboard/db';
import { createBoardSchema } from '@whiteboard/shared';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { ensureDefaultWorkspace, requireWorkspaceCreateAccess } from '@/server/workspace';

/**
 * Example board endpoints demonstrating the full pipeline: authentication,
 * schema validation, authorization, and safe responses. New endpoints should
 * follow this shape.
 */

// GET /api/boards — boards the current user owns or collaborates on.
export const GET = defineRoute({ auth: true, rateLimit: 'API_DEFAULT' }, async ({ user }) => {
  const me = requireUser(user);
  const boards = await prisma.board.findMany({
    where: {
      archivedAt: null,
      OR: [{ createdById: me.id }, { collaborators: { some: { userId: me.id } } }],
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { id: true, name: true, updatedAt: true },
  });
  return json({ boards });
});

// POST /api/boards — create a board. Targets an explicit workspace the caller
// has EDITOR+ in, or falls back to their personal workspace.
export const POST = defineRoute(
  { auth: true, body: createBoardSchema, rateLimit: 'BOARD_CREATE' },
  async ({ user, body }) => {
    const me = requireUser(user);

    const workspaceId = body.workspaceId
      ? await requireWorkspaceCreateAccess(me.id, body.workspaceId)
      : await ensureDefaultWorkspace(me);

    // No explicit collaborator row: the creator is Owner of their board via
    // `createdById`, and workspace members inherit access (S4.8).
    const board = await prisma.board.create({
      data: {
        name: body.name,
        background: body.background,
        workspaceId,
        createdById: me.id,
      },
      select: { id: true, name: true },
    });

    return json({ board }, { status: 201 });
  },
);
