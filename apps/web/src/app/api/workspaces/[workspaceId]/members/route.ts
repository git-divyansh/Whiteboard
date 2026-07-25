import { prisma } from '@whiteboard/db';
import { AppError, inviteMemberSchema, workspaceIdParamSchema } from '@whiteboard/shared';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { getClientIp } from '@/server/api/context';
import { writeAudit } from '@/server/audit';
import { requireWorkspaceManage, requireWorkspaceMembership } from '@/server/workspace';

/**
 * Workspace members (S4.5 / S4.6).
 *  GET  — list members (visible to any member).
 *  POST — add an existing user by email with a role (Owner/Admin only).
 *
 * Email-based invitations to users without an account require email delivery
 * (deferred); adding an existing teammate works today.
 */

export const GET = defineRoute({ auth: true, rateLimit: 'API_DEFAULT' }, async ({ user, params }) => {
  const me = requireUser(user);
  const { workspaceId } = workspaceIdParamSchema.parse(params);
  await requireWorkspaceMembership(me.id, workspaceId);

  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return json({
    members: rows.map((row) => ({
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      image: row.user.image,
      role: row.role,
    })),
  });
});

export const POST = defineRoute(
  { auth: true, body: inviteMemberSchema, rateLimit: 'INVITE' },
  async ({ user, body, params, req }) => {
    const me = requireUser(user);
    const { workspaceId } = workspaceIdParamSchema.parse(params);
    await requireWorkspaceManage(me.id, workspaceId);

    const target = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (!target) {
      throw AppError.notFound('No account found for that email. Ask them to sign up first.');
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: target.id } },
      select: { role: true },
    });
    if (existing?.role === 'OWNER') {
      throw AppError.validation('That user is the workspace owner.');
    }

    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: target.id } },
      update: { role: body.role },
      create: { workspaceId, userId: target.id, role: body.role },
    });

    await writeAudit({
      actorId: me.id,
      action: 'USER_INVITED',
      targetType: 'workspace',
      targetId: workspaceId,
      metadata: { memberId: target.id, role: body.role },
      ip: getClientIp(req),
    });

    return json({ ok: true }, { status: existing ? 200 : 201 });
  },
);
