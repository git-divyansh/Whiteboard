import { prisma } from '@whiteboard/db';
import { boardIdParamSchema, updateBoardSchema } from '@whiteboard/shared';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { requireBoardPermission } from '@/server/authz';

// PATCH /api/boards/:boardId — rename / restyle a board. Requires board:edit
// (Owner/Admin/Editor); viewers and guests are rejected.
export const PATCH = defineRoute(
  { auth: true, body: updateBoardSchema, rateLimit: 'API_DEFAULT' },
  async ({ user, body, params }) => {
    const me = requireUser(user);
    const { boardId } = boardIdParamSchema.parse(params);
    await requireBoardPermission(me, boardId, 'board:edit');

    const board = await prisma.board.update({
      where: { id: boardId },
      // Undefined fields are ignored by Prisma, so a partial patch is safe.
      data: { name: body.name, background: body.background },
      select: { id: true, name: true },
    });

    return json({ board });
  },
);

/**
 * DELETE /api/boards/:boardId — soft-delete (archive) a board.
 *
 * Soft delete (set `archivedAt`) rather than a hard delete so the board can be
 * restored from Trash (S3.3) and audit/version history is preserved. Requires
 * the `board:delete` permission — only OWNER/ADMIN hold it, so editors and
 * viewers are rejected. Access is resolved server-side; the id is never trusted
 * as proof of permission (Guidelines #2, #22).
 */
export const DELETE = defineRoute(
  { auth: true, rateLimit: 'API_DEFAULT' },
  async ({ user, params }) => {
    const me = requireUser(user);
    const { boardId } = boardIdParamSchema.parse(params);

    // Throws FORBIDDEN if the user lacks delete rights (or the board is hidden
    // from them entirely — non-existent boards resolve to no role → 403, which
    // also avoids leaking board existence).
    await requireBoardPermission(me, boardId, 'board:delete');

    await prisma.board.update({
      where: { id: boardId },
      data: { archivedAt: new Date() },
    });

    return json({ ok: true, id: boardId });
  },
);
