import { prisma } from '@whiteboard/db';
import { AppError, boardCollaboratorBodySchema, boardIdParamSchema } from '@whiteboard/shared';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { getClientIp } from '@/server/api/context';
import { writeAudit } from '@/server/audit';
import { requireBoardPermission } from '@/server/authz';

/**
 * Per-board collaborators (S4.7) — explicit grants that override the workspace
 * default for a single board. GET needs board:view; POST needs board:share
 * (Owner/Admin). Adding an existing user by email; email delivery to new users
 * is deferred.
 */

export const GET = defineRoute({ auth: true, rateLimit: 'API_DEFAULT' }, async ({ user, params }) => {
  const me = requireUser(user);
  const { boardId } = boardIdParamSchema.parse(params);
  await requireBoardPermission(me, boardId, 'board:view');

  const rows = await prisma.boardCollaborator.findMany({
    where: { boardId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, user: { select: { id: true, name: true, email: true } } },
  });
  return json({
    collaborators: rows.map((row) => ({
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      role: row.role,
    })),
  });
});

export const POST = defineRoute(
  { auth: true, body: boardCollaboratorBodySchema, rateLimit: 'INVITE' },
  async ({ user, body, params, req }) => {
    const me = requireUser(user);
    const { boardId } = boardIdParamSchema.parse(params);
    await requireBoardPermission(me, boardId, 'board:share');

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { createdById: true },
    });
    if (!board) {
      throw AppError.notFound('Board not found');
    }

    const target = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (!target) {
      throw AppError.notFound('No account found for that email. Ask them to sign up first.');
    }
    if (target.id === board.createdById) {
      throw AppError.validation('That user is the board owner.');
    }

    await prisma.boardCollaborator.upsert({
      where: { boardId_userId: { boardId, userId: target.id } },
      update: { role: body.role },
      create: { boardId, userId: target.id, role: body.role, invitedById: me.id },
    });

    await writeAudit({
      actorId: me.id,
      action: 'BOARD_SHARED',
      targetType: 'board',
      targetId: boardId,
      metadata: { collaboratorId: target.id, role: body.role },
      ip: getClientIp(req),
    });
    return json({ ok: true }, { status: 201 });
  },
);
