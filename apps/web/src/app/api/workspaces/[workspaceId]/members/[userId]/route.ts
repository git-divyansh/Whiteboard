import { prisma } from '@whiteboard/db';
import { AppError, cuidSchema, memberRoleBodySchema } from '@whiteboard/shared';
import { z } from 'zod';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { getClientIp } from '@/server/api/context';
import { writeAudit } from '@/server/audit';
import { requireWorkspaceManage } from '@/server/workspace';

/**
 * A single workspace member (S4.6). PATCH changes their role; DELETE removes
 * them. Both require Owner/Admin. The Owner's membership is protected — it can
 * neither be re-roled nor removed here.
 */

const memberParamSchema = z.object({ workspaceId: cuidSchema, userId: cuidSchema });

export const PATCH = defineRoute(
  { auth: true, body: memberRoleBodySchema, rateLimit: 'API_DEFAULT' },
  async ({ user, body, params, req }) => {
    const me = requireUser(user);
    const { workspaceId, userId } = memberParamSchema.parse(params);
    await requireWorkspaceManage(me.id, workspaceId);

    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    if (!target) {
      throw AppError.notFound('Member not found');
    }
    if (target.role === 'OWNER') {
      throw AppError.validation("The owner's role can't be changed here.");
    }

    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role: body.role },
    });

    await writeAudit({
      actorId: me.id,
      action: 'PERMISSION_CHANGED',
      targetType: 'workspace',
      targetId: workspaceId,
      metadata: { memberId: userId, from: target.role, to: body.role },
      ip: getClientIp(req),
    });
    return json({ ok: true });
  },
);

export const DELETE = defineRoute(
  { auth: true, rateLimit: 'API_DEFAULT' },
  async ({ user, params, req }) => {
    const me = requireUser(user);
    const { workspaceId, userId } = memberParamSchema.parse(params);
    await requireWorkspaceManage(me.id, workspaceId);

    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    if (!target) {
      throw AppError.notFound('Member not found');
    }
    if (target.role === 'OWNER') {
      throw AppError.validation("The owner can't be removed.");
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    await writeAudit({
      actorId: me.id,
      action: 'PERMISSION_CHANGED',
      targetType: 'workspace',
      targetId: workspaceId,
      metadata: { memberId: userId, removed: true },
      ip: getClientIp(req),
    });
    return json({ ok: true });
  },
);
