import { randomBytes } from 'node:crypto';

import { prisma } from '@whiteboard/db';
import { boardIdParamSchema, shareLinkBodySchema } from '@whiteboard/shared';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { getClientIp } from '@/server/api/context';
import { writeAudit } from '@/server/audit';
import { requireBoardPermission } from '@/server/authz';

/**
 * Board share links (S4.7). Create/list requires board:share (Owner/Admin).
 * The token is opaque and high-entropy (Guideline #13). NOTE: redeeming a link
 * to grant a visitor access is a separate follow-up (needs a token→access path
 * in resolveBoardRole + a public board view).
 */

export const GET = defineRoute({ auth: true, rateLimit: 'API_DEFAULT' }, async ({ user, params }) => {
  const me = requireUser(user);
  const { boardId } = boardIdParamSchema.parse(params);
  await requireBoardPermission(me, boardId, 'board:share');

  const links = await prisma.shareLink.findMany({
    where: { boardId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, token: true, access: true, role: true, expiresAt: true },
  });
  return json({ shareLinks: links });
});

export const POST = defineRoute(
  { auth: true, body: shareLinkBodySchema, rateLimit: 'API_DEFAULT' },
  async ({ user, body, params, req }) => {
    const me = requireUser(user);
    const { boardId } = boardIdParamSchema.parse(params);
    await requireBoardPermission(me, boardId, 'board:share');

    const token = randomBytes(24).toString('base64url');
    const link = await prisma.shareLink.create({
      data: {
        boardId,
        token,
        access: body.access,
        role: body.role,
        createdById: me.id,
        expiresAt: body.expiresAt ?? null,
      },
      select: { id: true, token: true, access: true, role: true, expiresAt: true },
    });

    await writeAudit({
      actorId: me.id,
      action: 'BOARD_SHARED',
      targetType: 'board',
      targetId: boardId,
      metadata: { shareLinkId: link.id, access: body.access, role: body.role },
      ip: getClientIp(req),
    });
    return json({ shareLink: link }, { status: 201 });
  },
);
