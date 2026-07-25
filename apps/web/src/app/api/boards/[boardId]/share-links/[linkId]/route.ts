import { prisma } from '@whiteboard/db';
import { cuidSchema } from '@whiteboard/shared';
import { z } from 'zod';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { getClientIp } from '@/server/api/context';
import { writeAudit } from '@/server/audit';
import { requireBoardPermission } from '@/server/authz';

/** Revoke a board share link (S4.7). Soft-revoke via `revokedAt`. board:share. */
const paramSchema = z.object({ boardId: cuidSchema, linkId: cuidSchema });

export const DELETE = defineRoute(
  { auth: true, rateLimit: 'API_DEFAULT' },
  async ({ user, params, req }) => {
    const me = requireUser(user);
    const { boardId, linkId } = paramSchema.parse(params);
    await requireBoardPermission(me, boardId, 'board:share');

    // Scope to the board so a link id from another board can't be revoked here.
    await prisma.shareLink.updateMany({
      where: { id: linkId, boardId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await writeAudit({
      actorId: me.id,
      action: 'BOARD_UNSHARED',
      targetType: 'board',
      targetId: boardId,
      metadata: { shareLinkId: linkId },
      ip: getClientIp(req),
    });
    return json({ ok: true });
  },
);
