import { prisma } from '@whiteboard/db';
import { createWorkspaceSchema } from '@whiteboard/shared';

import { defineRoute, json, requireUser } from '@/server/api/handler';

/**
 * POST /api/workspaces — create a workspace the caller owns (S4.4).
 *
 * A workspace lives under an organization; a fresh org is created per workspace
 * with the caller as its owner and an OWNER workspace membership.
 */

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'workspace';
}

export const POST = defineRoute(
  { auth: true, body: createWorkspaceSchema, rateLimit: 'API_DEFAULT' },
  async ({ user, body }) => {
    const me = requireUser(user);
    const slug = `${slugify(body.name)}-${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    const workspace = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: body.name, slug, ownerId: me.id },
        select: { id: true },
      });
      return tx.workspace.create({
        data: {
          name: body.name,
          organizationId: org.id,
          members: { create: { userId: me.id, role: 'OWNER' } },
        },
        select: { id: true, name: true },
      });
    });

    return json({ workspace }, { status: 201 });
  },
);
