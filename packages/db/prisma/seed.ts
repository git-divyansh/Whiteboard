/* eslint-disable no-console */
/**
 * Idempotent development seed. Creates a demo user, organization, workspace, and
 * a welcome board so the app has something to render on first run.
 *
 * NOTE: no password is set here — credential hashing (Argon2id) is implemented
 * in the security session. Sign in via a dev OAuth provider or the credential
 * flow once that lands.
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@whiteboard.local' },
    update: {},
    create: {
      email: 'demo@whiteboard.local',
      name: 'Demo User',
      emailVerified: new Date(),
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: { name: 'Demo Organization', slug: 'demo-org', ownerId: user.id },
  });

  let workspace = await prisma.workspace.findFirst({
    where: { organizationId: org.id, name: 'Default Workspace' },
  });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Default Workspace',
        organizationId: org.id,
        members: { create: { userId: user.id, role: 'OWNER' } },
      },
    });
  }

  const board = await prisma.board.findFirst({
    where: { workspaceId: workspace.id, name: 'Welcome Board' },
  });
  if (!board) {
    await prisma.board.create({
      data: {
        name: 'Welcome Board',
        workspaceId: workspace.id,
        createdById: user.id,
        collaborators: { create: { userId: user.id, role: 'OWNER' } },
      },
    });
  }

  console.log('✓ Seed complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
