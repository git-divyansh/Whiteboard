import { Prisma, prisma } from '@whiteboard/db';
import { effectiveBoardRole } from '@whiteboard/shared';
import { SearchX } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BoardCard } from '@/components/dashboard/board-card';
import { NewBoardButton } from '@/components/dashboard/new-board-button';
import { TemplatesGallery } from '@/components/dashboard/templates-gallery';
import { ViewControls, type SortKey, type ViewMode } from '@/components/dashboard/view-controls';
import { getAuthUser } from '@/server/api/context';

export const metadata: Metadata = { title: 'Your boards' };

type Filter = 'recent' | 'mine' | 'shared' | 'starred' | 'trash' | 'templates';

const FILTERS: readonly Filter[] = ['recent', 'mine', 'shared', 'starred', 'trash', 'templates'];

const FILTER_TITLES: Record<Filter, string> = {
  recent: 'Recent',
  mine: 'My boards',
  shared: 'Shared with me',
  starred: 'Starred',
  trash: 'Trash',
  templates: 'Templates',
};

type SearchParams = Record<string, string | string[] | undefined>;

function parseFilter(value: string | string[] | undefined): Filter {
  return typeof value === 'string' && (FILTERS as readonly string[]).includes(value)
    ? (value as Filter)
    : 'recent';
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }

  const sp = await searchParams;
  const filter = parseFilter(sp.filter);
  const query = typeof sp.q === 'string' ? sp.q.trim() : '';
  const sort: SortKey = sp.sort === 'name' ? 'name' : 'updated';
  const view: ViewMode = sp.view === 'list' ? 'list' : 'grid';
  const wsParam = typeof sp.ws === 'string' ? sp.ws : undefined;

  // Only scope by workspace if the user is actually a member (never trust the id).
  let workspaceId: string | undefined;
  if (wsParam) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: wsParam, userId: user.id } },
      select: { workspaceId: true },
    });
    workspaceId = membership?.workspaceId;
  }

  const header = (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{FILTER_TITLES[filter]}</h1>
        {filter === 'templates' ? (
          <p className="text-sm text-muted-foreground">Start a new board from a template</p>
        ) : null}
      </div>
      {filter !== 'templates' ? <ViewControls sort={sort} view={view} /> : null}
    </div>
  );

  if (filter === 'templates') {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        {header}
        <TemplatesGallery workspaceId={workspaceId} />
      </main>
    );
  }

  const isTrash = filter === 'trash';

  // A board is accessible if you created it, are an explicit collaborator, or are
  // a member of its workspace (inheritance, S4.8).
  const accessibleOr: Prisma.BoardWhereInput[] = [
    { createdById: user.id },
    { collaborators: { some: { userId: user.id } } },
    { workspace: { members: { some: { userId: user.id } } } },
  ];

  const where: Prisma.BoardWhereInput = { archivedAt: isTrash ? { not: null } : null };
  if (filter === 'mine') {
    where.createdById = user.id;
  } else if (filter === 'shared') {
    where.createdById = { not: user.id };
    where.OR = [
      { collaborators: { some: { userId: user.id } } },
      { workspace: { members: { some: { userId: user.id } } } },
    ];
  } else {
    where.OR = accessibleOr;
  }
  if (filter === 'starred') {
    where.stars = { some: { userId: user.id } };
  }
  if (workspaceId) {
    where.workspaceId = workspaceId;
  }
  if (query) {
    where.name = { contains: query, mode: Prisma.QueryMode.insensitive };
  }

  const orderBy: Prisma.BoardOrderByWithRelationInput =
    sort === 'name' ? { name: 'asc' } : { updatedAt: 'desc' };

  const boards = await prisma.board.findMany({
    where,
    orderBy,
    take: 60,
    select: {
      id: true,
      name: true,
      updatedAt: true,
      createdById: true,
      workspaceId: true,
      collaborators: { where: { userId: user.id }, select: { role: true }, take: 1 },
      workspace: {
        select: { members: { where: { userId: user.id }, select: { role: true }, take: 1 } },
      },
      stars: { where: { userId: user.id }, select: { id: true }, take: 1 },
      thumbnail: { select: { updatedAt: true } },
    },
  });

  const cards = boards.map((board) => ({
    id: board.id,
    name: board.name,
    workspaceId: board.workspaceId,
    updatedLabel: board.updatedAt.toLocaleDateString(),
    role:
      effectiveBoardRole({
        isCreator: board.createdById === user.id,
        workspaceRole: board.workspace.members[0]?.role ?? null,
        boardGrant: board.collaborators[0]?.role ?? null,
      }) ?? 'VIEWER',
    starred: board.stars.length > 0,
    thumbnailVersion: board.thumbnail ? board.thumbnail.updatedAt.getTime().toString() : null,
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {header}
      <p className="-mt-4 mb-6 text-sm text-muted-foreground">
        {cards.length} {cards.length === 1 ? 'board' : 'boards'}
        {query ? ` matching “${query}”` : ''}
      </p>

      {cards.length === 0 ? (
        <EmptyState filter={filter} query={query} workspaceId={workspaceId} />
      ) : view === 'list' ? (
        <ul className="divide-y rounded-xl border">
          {cards.map((card) => (
            <li key={card.id}>
              <BoardCard {...card} view="list" trashed={isTrash} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <li key={card.id}>
              <BoardCard {...card} view="grid" trashed={isTrash} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function EmptyState({
  filter,
  query,
  workspaceId,
}: {
  filter: Filter;
  query: string;
  workspaceId?: string;
}) {
  const wrap = 'flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center';

  if (query) {
    return (
      <div className={wrap}>
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="size-6" />
        </div>
        <h2 className="text-lg font-medium">No matches</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          No boards match “{query}”. Try a different search.
        </p>
      </div>
    );
  }

  const messages: Partial<Record<Filter, { title: string; body: string }>> = {
    shared: { title: 'Nothing shared yet', body: 'Boards other people share with you appear here.' },
    starred: { title: 'No starred boards', body: 'Star a board to pin it here for quick access.' },
    trash: { title: 'Trash is empty', body: 'Deleted boards land here and can be restored.' },
  };
  const message = messages[filter];
  if (message) {
    return (
      <div className={wrap}>
        <h2 className="text-lg font-medium">{message.title}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message.body}</p>
      </div>
    );
  }

  return (
    <div className={wrap}>
      <h2 className="text-lg font-medium">No boards yet</h2>
      <p className="mb-6 mt-1 max-w-sm text-sm text-muted-foreground">
        Create your first board to start sketching, planning, and collaborating in real time.
      </p>
      <NewBoardButton label="Create your first board" workspaceId={workspaceId} />
    </div>
  );
}
