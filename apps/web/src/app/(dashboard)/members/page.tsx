import { prisma } from '@whiteboard/db';
import { can, canManageWorkspace, effectiveBoardRole } from '@whiteboard/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { BoardAccessPanel } from '@/components/dashboard/board-access-panel';
import { MembersManager } from '@/components/dashboard/members-manager';
import { getAuthUser } from '@/server/api/context';
import { getWorkspaceRole } from '@/server/workspace';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Members' };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string; tab?: string; board?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }

  const sp = await searchParams;
  let workspaceId = sp.ws;
  if (!workspaceId) {
    const first = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { workspaceId: true },
    });
    workspaceId = first?.workspaceId;
  }

  if (!workspaceId) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Members</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t belong to any workspace.</p>
      </main>
    );
  }

  const myRole = await getWorkspaceRole(user.id, workspaceId);
  if (!myRole) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Members</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are not a member of this workspace.
        </p>
      </main>
    );
  }

  const tab = sp.tab === 'boards' ? 'boards' : 'workspace';
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground">{workspace?.name}</p>
      </div>

      <div className="mb-6 flex gap-1 border-b">
        <TabLink href={`/members?ws=${workspaceId}`} active={tab === 'workspace'}>
          Workspace
        </TabLink>
        <TabLink href={`/members?ws=${workspaceId}&tab=boards`} active={tab === 'boards'}>
          Board access
        </TabLink>
      </div>

      {tab === 'workspace' ? (
        <WorkspaceMembers workspaceId={workspaceId} canManage={canManageWorkspace(myRole)} currentUserId={user.id} />
      ) : (
        <BoardAccess
          workspaceId={workspaceId}
          workspaceRole={myRole}
          userId={user.id}
          selectedBoardId={sp.board}
        />
      )}
    </main>
  );
}

async function WorkspaceMembers({
  workspaceId,
  canManage,
  currentUserId,
}: {
  workspaceId: string;
  canManage: boolean;
  currentUserId: string;
}) {
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, user: { select: { id: true, name: true, email: true } } },
  });
  const members = rows.map((row) => ({
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    role: row.role,
  }));
  return (
    <MembersManager
      workspaceId={workspaceId}
      members={members}
      canManage={canManage}
      currentUserId={currentUserId}
    />
  );
}

async function BoardAccess({
  workspaceId,
  workspaceRole,
  userId,
  selectedBoardId,
}: {
  workspaceId: string;
  workspaceRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  userId: string;
  selectedBoardId?: string;
}) {
  // Boards in this workspace the user can manage sharing for (board:share).
  const wsBoards = await prisma.board.findMany({
    where: { workspaceId, archivedAt: null },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      createdById: true,
      collaborators: { where: { userId }, select: { role: true }, take: 1 },
    },
  });
  const manageable = wsBoards.filter((b) => {
    const role = effectiveBoardRole({
      isCreator: b.createdById === userId,
      workspaceRole,
      boardGrant: b.collaborators[0]?.role ?? null,
    });
    return role ? can(role, 'board:share') : false;
  });

  const activeId =
    manageable.find((b) => b.id === selectedBoardId)?.id ?? manageable[0]?.id ?? null;

  let collaborators: { id: string; name: string | null; email: string; role: string }[] = [];
  if (activeId) {
    const board = await prisma.board.findUnique({
      where: { id: activeId },
      select: {
        createdById: true,
        collaborators: {
          orderBy: { createdAt: 'asc' },
          select: { role: true, user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    collaborators = (board?.collaborators ?? [])
      // Hide the board owner — their access is implicit, not a collaborator row.
      .filter((c) => c.user.id !== board?.createdById)
      .map((c) => ({ id: c.user.id, name: c.user.name, email: c.user.email, role: c.role }));
  }

  return (
    <BoardAccessPanel
      workspaceId={workspaceId}
      boards={manageable.map((b) => ({ id: b.id, name: b.name }))}
      selectedBoardId={activeId}
      collaborators={collaborators}
      currentUserId={userId}
    />
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-foreground text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  );
}
