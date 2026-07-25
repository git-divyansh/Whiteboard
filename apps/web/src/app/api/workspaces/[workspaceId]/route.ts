import { prisma } from '@whiteboard/db';
import { createWorkspaceSchema, workspaceIdParamSchema } from '@whiteboard/shared';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { requireWorkspaceManage } from '@/server/workspace';

/**
 * PATCH /api/workspaces/:workspaceId — rename a workspace (S6.9). Owner/Admin
 * only. Reuses the create schema's `{ name }` shape.
 */
export const PATCH = defineRoute(
  { auth: true, body: createWorkspaceSchema, rateLimit: 'API_DEFAULT' },
  async ({ user, body, params }) => {
    const me = requireUser(user);
    const { workspaceId } = workspaceIdParamSchema.parse(params);
    await requireWorkspaceManage(me.id, workspaceId);

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: body.name },
      select: { id: true, name: true },
    });
    return json({ workspace });
  },
);
