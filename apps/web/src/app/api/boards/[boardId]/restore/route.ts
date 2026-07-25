import { prisma } from '@whiteboard/db';
import { boardIdParamSchema } from '@whiteboard/shared';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { requireBoardPermission } from '@/server/authz';

/**
 * POST /api/boards/:boardId/restore — bring an archived board back (S3.3).
 * Requires board:delete (same authority that archived it: Owner/Admin).
 */
export const POST = defineRoute(
  { auth: true, rateLimit: 'API_DEFAULT' },
  async ({ user, params }) => {
    const me = requireUser(user);
    const { boardId } = boardIdParamSchema.parse(params);
    await requireBoardPermission(me, boardId, 'board:delete');

    await prisma.board.update({ where: { id: boardId }, data: { archivedAt: null } });
    return json({ ok: true, id: boardId });
  },
);
