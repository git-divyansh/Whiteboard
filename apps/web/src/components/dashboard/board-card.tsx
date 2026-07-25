'use client';

import { can, type Role } from '@whiteboard/shared';
import { Copy, Loader2, MoreHorizontal, Pencil, RotateCcw, Share2, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { RoleBadge } from '@/components/dashboard/role-badge';
import { ShareDialog } from '@/components/dashboard/share-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * A board in the dashboard (grid or list). Owners/admins/editors get a ⋯ menu
 * (Rename inline, Duplicate, Delete). Anyone who can view may star. In the Trash
 * view the card is inert except for Restore (owner/admin).
 *
 * `role`/`starred` only decide which controls render; every endpoint re-checks
 * permission server-side (Guideline #2), so this is UX, not the security border.
 */

interface BoardCardProps {
  id: string;
  name: string;
  workspaceId: string;
  updatedLabel: string;
  role: Role;
  view: 'grid' | 'list';
  starred: boolean;
  thumbnailVersion: string | null;
  trashed?: boolean;
}

type Mode = 'idle' | 'renaming' | 'confirm-delete';
type Busy = 'saving' | 'duplicating' | 'deleting' | 'restoring' | null;

export function BoardCard({
  id,
  name,
  workspaceId,
  updatedLabel,
  role,
  view,
  starred: initialStarred,
  thumbnailVersion,
  trashed = false,
}: BoardCardProps) {
  const router = useRouter();
  const canEdit = can(role, 'board:edit');
  const canDelete = can(role, 'board:delete');
  const canShare = can(role, 'board:share');
  const hasMenu = canEdit || canDelete || canShare;
  const [shareOpen, setShareOpen] = React.useState(false);

  const [displayName, setDisplayName] = React.useState(name);
  const [draft, setDraft] = React.useState(name);
  const [starred, setStarred] = React.useState(initialStarred);
  const [mode, setMode] = React.useState<Mode>('idle');
  const [busy, setBusy] = React.useState<Busy>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [navigating, setNavigating] = React.useState(false);

  React.useEffect(() => setDisplayName(name), [name]);
  React.useEffect(() => setStarred(initialStarred), [initialStarred]);

  async function send(input: string, init: RequestInit): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch(input, init);
      if (res.status === 401) {
        router.push('/login');
        return false;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? 'Something went wrong. Please try again.');
        return false;
      }
      return true;
    } catch {
      setError('Network error. Please try again.');
      return false;
    }
  }

  async function toggleStar() {
    const next = !starred;
    setStarred(next); // optimistic
    try {
      const res = await fetch(`/api/boards/${id}/star`, { method: next ? 'PUT' : 'DELETE' });
      if (!res.ok) {
        setStarred(!next);
        if (res.status === 401) router.push('/login');
        return;
      }
      router.refresh(); // keeps the Starred view / counts in sync
    } catch {
      setStarred(!next);
    }
  }

  async function submitRename() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === displayName) {
      setMode('idle');
      return;
    }
    setBusy('saving');
    const ok = await send(`/api/boards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    setBusy(null);
    if (ok) {
      setDisplayName(trimmed);
      setMode('idle');
      router.refresh();
    }
  }

  async function duplicate() {
    setBusy('duplicating');
    const ok = await send(`/api/boards/${id}/duplicate`, { method: 'POST' });
    setBusy(null);
    if (ok) router.refresh();
  }

  async function doDelete() {
    setBusy('deleting');
    const ok = await send(`/api/boards/${id}`, { method: 'DELETE' });
    if (ok) {
      router.refresh();
      return;
    }
    setBusy(null);
  }

  async function restore() {
    setBusy('restoring');
    const ok = await send(`/api/boards/${id}/restore`, { method: 'POST' });
    if (ok) {
      router.refresh();
      return;
    }
    setBusy(null);
  }

  // ----- Trash view: inert card with a Restore action -----
  if (trashed) {
    return (
      <div
        className={cn(
          'group relative flex items-center gap-3',
          view === 'list' ? 'px-4 py-3 first:rounded-t-xl last:rounded-b-xl' : 'flex-col',
        )}
      >
        {view === 'grid' ? (
          <div className="w-full">
            <BoardThumb id={id} name={displayName} version={thumbnailVersion} size="card" muted />
          </div>
        ) : (
          <BoardThumb id={id} name={displayName} version={thumbnailVersion} size="list" muted />
        )}
        <div className={cn('min-w-0', view === 'grid' ? 'w-full px-1 pt-3' : 'flex-1')}>
          <div className="truncate font-medium text-muted-foreground">{displayName}</div>
          <div className="text-xs text-muted-foreground">Archived · {updatedLabel}</div>
        </div>
        {canDelete ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void restore()}
            disabled={busy === 'restoring'}
            className={view === 'grid' ? 'mt-1 self-start' : ''}
          >
            <RotateCcw />
            {busy === 'restoring' ? 'Restoring…' : 'Restore'}
          </Button>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const menu = hasMenu ? (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Board actions"
        disabled={busy !== null}
        className="flex size-8 items-center justify-center rounded-md border bg-background/80 text-muted-foreground opacity-0 backdrop-blur transition hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 disabled:opacity-50"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {canShare ? (
          <DropdownMenuItem onSelect={() => setShareOpen(true)}>
            <Share2 />
            Share
          </DropdownMenuItem>
        ) : null}
        {canShare && canEdit ? <DropdownMenuSeparator /> : null}
        {canEdit ? (
          <>
            <DropdownMenuItem
              onSelect={() => {
                setError(null);
                setDraft(displayName);
                setMode('renaming');
              }}
            >
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void duplicate()}>
              <Copy />
              Duplicate
            </DropdownMenuItem>
          </>
        ) : null}
        {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
        {canDelete ? (
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setError(null);
              setMode('confirm-delete');
            }}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const starButton = (
    <button
      type="button"
      aria-label={starred ? 'Unstar board' : 'Star board'}
      aria-pressed={starred}
      onClick={() => void toggleStar()}
      className="flex size-8 items-center justify-center rounded-md border bg-background/80 backdrop-blur transition hover:bg-accent"
    >
      <Star
        className={cn('size-4', starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')}
      />
    </button>
  );

  const overlays = (
    <>
      {navigating ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-background/60 backdrop-blur-[1px]">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {canShare ? (
        <ShareDialog
          boardId={id}
          boardName={displayName}
          workspaceId={workspaceId}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      ) : null}

      {mode === 'renaming' ? (
        <div className="absolute inset-0 z-10 flex items-center gap-2 rounded-[inherit] border bg-background/98 px-3 backdrop-blur">
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submitRename();
              if (event.key === 'Escape') setMode('idle');
            }}
            aria-label="Board name"
            className="h-8 min-w-0 flex-1 rounded border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button size="sm" onClick={() => void submitRename()} disabled={busy === 'saving'}>
            {busy === 'saving' ? 'Saving…' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMode('idle')}
            disabled={busy === 'saving'}
          >
            Cancel
          </Button>
        </div>
      ) : null}

      {mode === 'confirm-delete' ? (
        <div className="absolute inset-0 z-10 flex flex-wrap items-center justify-center gap-2 rounded-[inherit] border bg-background/98 px-3 text-center text-sm backdrop-blur">
          <span className="truncate">
            Delete <span className="font-medium">{displayName}</span>?
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void doDelete()}
            disabled={busy === 'deleting'}
          >
            {busy === 'deleting' ? 'Deleting…' : 'Delete'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMode('idle')}
            disabled={busy === 'deleting'}
          >
            Cancel
          </Button>
        </div>
      ) : null}

      {mode === 'idle' && error ? (
        <div
          role="alert"
          className="absolute inset-x-2 bottom-2 z-10 truncate rounded bg-destructive/10 px-2 py-1 text-xs text-destructive"
        >
          {error}
        </div>
      ) : null}
    </>
  );

  if (view === 'list') {
    return (
      <div className="group relative flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-accent">
        <Link
          href={`/board/${id}`}
          onClick={() => setNavigating(true)}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <BoardThumb id={id} name={displayName} version={thumbnailVersion} size="list" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{displayName}</div>
            <div className="text-xs text-muted-foreground">Updated {updatedLabel}</div>
          </div>
        </Link>
        {starButton}
        <RoleBadge role={role} className="shrink-0" />
        {hasMenu && mode === 'idle' ? menu : null}
        {overlays}
      </div>
    );
  }

  return (
    <div className="group relative">
      <Link
        href={`/board/${id}`}
        onClick={() => setNavigating(true)}
        className="block overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/20 hover:bg-accent"
      >
        <BoardThumb id={id} name={displayName} version={thumbnailVersion} size="card" />
        <div className="flex items-start justify-between gap-2 p-4">
          <div className="min-w-0">
            <div className="truncate font-medium">{displayName}</div>
            <div className="mt-1 text-xs text-muted-foreground">Updated {updatedLabel}</div>
          </div>
          <RoleBadge role={role} className="mt-0.5 shrink-0" />
        </div>
      </Link>
      <div className="absolute left-2 top-2">{starButton}</div>
      {hasMenu && mode === 'idle' ? <div className="absolute right-2 top-2">{menu}</div> : null}
      {overlays}
    </div>
  );
}

function BoardThumb({
  id,
  name,
  version,
  size,
  muted = false,
}: {
  id: string;
  name: string;
  version: string | null;
  size: 'card' | 'list';
  muted?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const showImage = version && !failed;
  const src = `/api/boards/${id}/thumbnail?v=${version}`;

  if (size === 'card') {
    return (
      <div
        className={cn(
          'flex aspect-[16/10] items-center justify-center overflow-hidden border-b bg-muted/40',
          muted && 'rounded-xl border opacity-70',
        )}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="select-none text-3xl font-semibold text-muted-foreground/40">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-sm font-semibold text-muted-foreground/50">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}
