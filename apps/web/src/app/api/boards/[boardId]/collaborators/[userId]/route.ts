import { prisma } from '@whiteboard/db';
import { cuidSchema } from '@whiteboard/shared';
import { z } from 'zod';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { getClientIp } from '@/server/api/context';
import { writeAudit } from '@/server/audit';
import { requireBoardPermission } from '@/server/authz';

/** Remove a per-board collaborator grant (S4.7). Requires board:share. */
const paramSchema = z.object({ boardId: cuidSchema, userId: cuidSchema });

export const DELETE = defineRoute(
  { auth: true, rateLimit: 'API_DEFAULT' },
  async ({ user, params, req }) => {
    const me = requireUser(user);
    const { boardId, userId } = paramSchema.parse(params);
    await requireBoardPermission(me, boardId, 'board:share');

    await prisma.boardCollaborator.deleteMany({ where: { boardId, userId } });

    await writeAudit({
      actorId: me.id,
      action: 'BOARD_UNSHARED',
      targetType: 'board',
      targetId: boardId,
      metadata: { collaboratorId: userId },
      ip: getClientIp(req),
    });
    return json({ ok: true });
  },
);
