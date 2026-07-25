import { prisma } from '@whiteboard/db';
import { boardIdParamSchema } from '@whiteboard/shared';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { requireBoardPermission } from '@/server/authz';

/**
 * Star / unstar a board for the current user (S3.2). Anyone who can view a board
 * may star it; stars are per-user (Guideline #2 — access is re-checked here).
 */

export const PUT = defineRoute({ auth: true, rateLimit: 'API_DEFAULT' }, async ({ user, params }) => {
  const me = requireUser(user);
  const { boardId } = boardIdParamSchema.parse(params);
  await requireBoardPermission(me, boardId, 'board:view');

  await prisma.boardStar.upsert({
    where: { userId_boardId: { userId: me.id, boardId } },
    update: {},
    create: { userId: me.id, boardId },
  });
  return json({ starred: true });
});

export const DELETE = defineRoute(
  { auth: true, rateLimit: 'API_DEFAULT' },
  async ({ user, params }) => {
    const me = requireUser(user);
    const { boardId } = boardIdParamSchema.parse(params);
    await requireBoardPermission(me, boardId, 'board:view');

    await prisma.boardStar.deleteMany({ where: { userId: me.id, boardId } });
    return json({ starred: false });
  },
);
