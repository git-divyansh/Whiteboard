import { can } from '@whiteboard/shared';
import Link from 'next/link';

import { WhiteboardCanvas } from '@/components/canvas/whiteboard-canvas';
import { ThemeToggle } from '@/components/theme-toggle';
import { env } from '@/env';
import { getAuthUser } from '@/server/api/context';
import { resolveBoardRole } from '@/server/authz';

/**
 * Board workspace. In the foundation this route is open so the canvas can be
 * exercised; the security session must (a) require an authenticated session and
 * (b) verify board access here before rendering (Guideline #22).
 */
export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { boardId } = await params;
  const { template } = await searchParams;

  // Resolve the viewer's effective board role → edit permission (S5.2). Mirrors
  // the realtime server's write gate, so the UI matches what the server allows.
  const user = await getAuthUser();
  let canEdit = false;
  if (user) {
    const role = await resolveBoardRole(user.id, boardId);
    canEdit = role ? can(role, 'board:edit') : false;
  } else {
    // Dev-anon fallback matches the realtime token (EDITOR) when enabled.
    canEdit = env.NODE_ENV !== 'production' && env.ALLOW_DEV_ANON_REALTIME;
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold">
            Whiteboard
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">{boardId}</span>
        </div>
        <ThemeToggle />
      </header>
      <div className="relative flex-1">
        <WhiteboardCanvas boardId={boardId} initialTemplate={template} canEdit={canEdit} />
      </div>
    </div>
  );
}
