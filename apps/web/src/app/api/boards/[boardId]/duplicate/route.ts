import { prisma } from '@whiteboard/db';
import { AppError, LIMITS, boardIdParamSchema } from '@whiteboard/shared';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { requireBoardPermission } from '@/server/authz';
import { requireWorkspaceCreateAccess } from '@/server/workspace';

/**
 * POST /api/boards/:boardId/duplicate — copy a board into its workspace.
 *
 * The caller must be able to view the source (board:view) AND create boards in
 * its workspace (EDITOR+). The copy is owned by the caller and includes the
 * latest persisted canvas snapshot so the duplicate opens with the same content.
 */

const COPY_SUFFIX = ' (copy)';

export const POST = defineRoute(
  { auth: true, rateLimit: 'BOARD_CREATE' },
  async ({ user, params }) => {
    const me = requireUser(user);
    const { boardId } = boardIdParamSchema.parse(params);

    await requireBoardPermission(me, boardId, 'board:view');

    const source = await prisma.board.findUnique({
      where: { id: boardId },
      select: { name: true, background: true, workspaceId: true, archivedAt: true },
    });
    if (!source || source.archivedAt) {
      throw AppError.notFound('Board not found');
    }

    // Must be allowed to create in the destination workspace.
    await requireWorkspaceCreateAccess(me.id, source.workspaceId);

    // Copy the most recent snapshot so the duplicate isn't blank.
    const latest = await prisma.boardSnapshot.findFirst({
      where: { boardId },
      orderBy: { version: 'desc' },
      select: { version: true, state: true },
    });

    // Keep the "(copy)" suffix without exceeding the name length limit.
    const maxBase = LIMITS.BOARD_NAME_MAX_LENGTH - COPY_SUFFIX.length;
    const name = `${source.name.slice(0, maxBase)}${COPY_SUFFIX}`;

    const board = await prisma.$transaction(async (tx) => {
      const created = await tx.board.create({
        data: {
          name,
          background: source.background,
          workspaceId: source.workspaceId,
          createdById: me.id,
          version: latest?.version ?? 0,
        },
        select: { id: true, name: true },
      });
      if (latest) {
        await tx.boardSnapshot.create({
          data: { boardId: created.id, version: latest.version, state: latest.state },
        });
      }
      return created;
    });

    return json({ board }, { status: 201 });
  },
);
